"""
Mus.Hub (SONIC ARCHIVE) — Serverless GPU Singing Voice Conversion Worker (Modal.com)

Pipeline (~12-20 seconds on A10G, $0 idle cost when unused):
  1. Download/decode 30s AI-composed chorus track (from MiniMax Music) + user's 5-15s voice sample
  2. Separate lead vocal & accompaniment using Demucs (`htdemucs`)
  3. Run Zero-Shot Singing Voice Conversion (`Seed-VC`, Plachtaa/seed-vc) preserving pitch & melody
     while transferring the user's vocal timbre with zero fine-tuning required
  4. Mix converted vocal + original accompaniment with light studio EQ/reverb via ffmpeg (max 30s)
  5. Return base64 MP3 to Cloudflare Worker

Quick Deploy (takes ~5 min once):
  pip install modal
  modal setup
  modal deploy ai-gpu-worker/seed_vc_worker.py

Then copy the printed HTTPS endpoint URL and run in the repo root:
  wrangler secret put VOICE_CLONE_ENDPOINT
  wrangler secret put VOICE_CLONE_SECRET
"""

from __future__ import annotations

import base64
import os
import subprocess
import tempfile
from pathlib import Path

import modal

app = modal.App("mushub-seed-vc-worker")

image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg", "git", "libsndfile1")
    .pip_install(
        "torch==2.4.1",
        "torchaudio==2.4.1",
        "demucs==4.0.1",
        "fastapi[standard]",
        "httpx",
        "scipy",
        "soundfile",
        "librosa",
        "huggingface_hub",
        "pyyaml",
        "munch",
        "einops",
        "descript-audio-codec",
        "transformers",
    )
    .run_commands(
        "git clone --depth 1 https://github.com/Plachtaa/seed-vc.git /opt/seed-vc",
        "pip install -r /opt/seed-vc/requirements.txt || true",
    )
)


@app.function(
    image=image,
    gpu="A10G",
    timeout=180,
    scaledown_window=60,
    secrets=[modal.Secret.from_name("mushub-worker-secret", required=False)],
)
@modal.fastapi_endpoint(method="POST")
def convert_singing_voice(payload: dict, request_secret: str = "") -> dict:
    import httpx

    expected_secret = os.environ.get("VOICE_CLONE_SECRET", "")
    if expected_secret and request_secret != expected_secret:
        return {"error": "Unauthorized"}

    source_url = payload.get("source_audio_url")
    source_hex = payload.get("source_audio_hex")
    ref_b64 = payload.get("reference_voice_b64")
    max_sec = min(35, max(10, int(payload.get("max_duration_sec", 30))))

    if not ref_b64 or (not source_url and not source_hex):
        return {"error": "Missing source audio or reference voice"}

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        src_raw = work / "source_raw.mp3"
        src_wav = work / "source.wav"
        ref_raw = work / "ref_raw.bin"
        ref_wav = work / "ref.wav"

        # 1. Save source chorus & user reference voice
        if source_url:
            with httpx.Client(timeout=30.0, follow_redirects=True) as client:
                r = client.get(source_url)
                r.raise_for_status()
                src_raw.write_bytes(r.content)
        else:
            src_raw.write_bytes(bytes.fromhex(source_hex))

        ref_raw.write_bytes(base64.b64decode(ref_b64))

        # Trim source to max 30s & normalize both to 44.1kHz WAV
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(src_raw), "-t", str(max_sec), "-ar", "44100", "-ac", "2", str(src_wav)],
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(ref_raw), "-t", "15", "-ar", "22050", "-ac", "1", str(ref_wav)],
            check=True,
            capture_output=True,
        )

        # 2. Separate vocal & instrumental stems via Demucs (two-stems=vocals)
        stems_dir = work / "stems"
        subprocess.run(
            [
                "python",
                "-m",
                "demucs.separate",
                "--two-stems=vocals",
                "-n",
                "htdemucs",
                "-o",
                str(stems_dir),
                str(src_wav),
            ],
            check=True,
            capture_output=True,
        )
        vocal_stem = stems_dir / "htdemucs" / "source" / "vocals.wav"
        inst_stem = stems_dir / "htdemucs" / "source" / "no_vocals.wav"

        # 3. Zero-Shot Singing Voice Conversion via Seed-VC (f0-conditioned singing mode)
        vc_out_dir = work / "vc_out"
        vc_out_dir.mkdir(exist_ok=True)
        subprocess.run(
            [
                "python",
                "/opt/seed-vc/inference.py",
                "--source",
                str(vocal_stem),
                "--target",
                str(ref_wav),
                "--output",
                str(vc_out_dir),
                "--f0-condition",
                "True",
                "--auto-f0-adjust",
                "True",
                "--diffusion-steps",
                "25",
            ],
            check=True,
            capture_output=True,
            cwd="/opt/seed-vc",
        )

        converted_candidates = sorted(vc_out_dir.glob("*.wav"))
        if not converted_candidates:
            return {"error": "Seed-VC did not emit output wav"}
        converted_vocal = converted_candidates[0]

        # 4. Remix converted user vocal + original accompaniment with gentle warmth & loudness balance
        final_mp3 = work / "final_30s.mp3"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(converted_vocal),
                "-i",
                str(inst_stem),
                "-filter_complex",
                "[0:a]highpass=f=85,aecho=0.8:0.85:35:0.18,volume=1.08[v];"
                "[1:a]volume=0.92[i];"
                "[v][i]amix=inputs=2:duration=shortest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]",
                "-map",
                "[out]",
                "-t",
                str(max_sec),
                "-b:a",
                "160k",
                str(final_mp3),
            ],
            check=True,
            capture_output=True,
        )

        return {
            "audio_b64": base64.b64encode(final_mp3.read_bytes()).decode("ascii"),
            "duration_sec": max_sec,
        }
