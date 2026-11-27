/**
 * Shared Simplified -> Traditional Chinese converter + Mandopop / Cantopop / Western Pop / J-Pop
 * bilingual artist alias table used by BOTH Cloudflare Edge Worker and Browser Client.
 *
 * Why this matters:
 * - Apple Music TW/HK/SG/US catalogs iconic Mandopop & Cantopop artists under Traditional Chinese
 *   (e.g., 孫燕姿, 周杰倫, 陳奕迅, 林俊傑, 鄧紫棋, 張學友, 梁靜茹, 蔡依林, 張國榮) and/or English names.
 * - Deezer indexes almost all Mandopop & Western Pop under English/romanized names (e.g., Stefanie Sun,
 *   Jay Chou, Eason Chan, JJ Lin, Taylor Swift, The Weeknd).
 * - Neither API auto-converts Simplified Chinese queries, causing empty results unless expanded.
 */

const S2T_PAIRS =
  '孙孫伦倫杰傑张張陈陳刘劉杨楊赵趙吴吳郑鄭冯馮许許吕呂严嚴华華谢謝邹鄒窦竇苏蘇卢盧马馬凤鳳鲍鮑费費薛薛贺賀汤湯罗羅毕畢邬鄔萧蕭谈談庞龐纪紀项項蓝藍闵閔强強贾賈娄婁颜顏钟鍾万萬经經应應邓鄧单單诸諸钮鈕龚龔陆陸荣榮储儲乌烏车車宁寧栾欒厉厲叶葉蓟薊怀懷从從赖賴蔺藺乔喬阴陰苍蒼双雙闻聞党黨谭譚贡貢劳勞郦酈却卻寿壽边邊农農温溫别別庄莊阎閻连連习習鱼魚终終满滿国國广廣禄祿阙闕东東欧歐师師巩鞏聂聶阚闞简簡饶饒养養丰豐关關权權盖蓋绮綺贞貞莹瑩玮瑋涵涵轩軒谦謙亿億忆憶莲蓮桦樺丽麗仪儀凯凱伟偉欢歡乐樂恋戀伤傷泪淚痛痛独獨寂寂孤孤拥擁离離归歸约約续續结結线線绕繞绘繪绝絕缘緣编編缓緩纵縱细細给給维維绵綿绿綠绚絢绽綻绯緋织織纯純纸紙级級纷紛纺紡纳納纽紐纬緯练練组組绅紳绊絆绍紹驿驛绑綁绒絨娇嬌娆嬈娱娛娴嫻婵嬋婴嬰实實宠寵审審宝寶宽寬宾賓寻尋导導尽盡层層届屆属屬岁歲岂豈岗崗岛島岭嶺屿嶼峡峽巅巔币幣帅帥帐帳帘簾帜幟带帶帮幫庆慶庙廟废廢异異弃棄弹彈弥彌弯彎当當录錄彻徹径徑忧憂态態怅悵怜憐总總恳懇恶惡恼惱悬懸悯憫惊驚惧懼惨慘惯慣愤憤愿願懒懶戏戲战戰户戶扑撲执執扩擴扫掃扬揚扰擾抚撫抛拋抢搶护護报報担擔拟擬拨撥择擇挂掛挚摯挡擋挣掙挤擠挥揮捞撈损損捡撿换換捣搗据據摇搖撑撐攒攢敌敵敛斂数數斋齋断斷无無旧舊时時旷曠晓曉晕暈暂暫书書会會胧朧术術机機杀殺杂雜条條来來极極构構枪槍枫楓标標栈棧栋棟栏欄树樹栖棲样樣桥橋梦夢检檢樱櫻叹嘆历歷残殘殇殤气氣氢氫汇匯汉漢汹洶沧滄沪滬泽澤洁潔洒灑浅淺浇澆浊濁测測济濟浏瀏浑渾浓濃涂塗涌湧涛濤涟漣涡渦焕煥涤滌润潤涨漲涩澀渊淵渐漸渔漁渗滲湾灣湿濕溃潰溅濺滚滾滤濾滥濫滨濱滩灘澜瀾灭滅灯燈灵靈灾災灿燦炉爐炽熾烁爍烂爛烟煙烦煩烧燒热熱爱愛爷爺牵牽犹猶狭狹狮獅猎獵献獻兽獸环環现現琼瓊瑶瑤产產亩畝畅暢画畫叠疊疯瘋痴癡疗療发發皱皺盗盜盏盞监監盘盤众眾睁睜瞩矚矫矯矿礦码碼砖磚砚硯礼禮祸禍禅禪种種称稱稳穩穷窮窝窩窥窺竞競笔筆简簡筝箏节節篮籃篱籬粤粵紧緊繁繁纤纖纱紗纲綱纹紋络絡绞絞统統丝絲绢絹继繼绩績绪緒绰綽绳繩绷繃综綜缀綴缅緬缔締缕縷缝縫缠纏缩縮缴繳网網罚罰罢罷羁羈羡羨义義联聯聪聰声聲职職肃肅肠腸肤膚胆膽胜勝胶膠脉脈脑腦脚腳脱脫脸臉腊臘腾騰卧臥临臨兴興举舉舰艦舱艙艰艱艳艷艺藝芦蘆荐薦药藥获獲莺鶯萨薩著著蒋蔣蓝藍蔷薔蔼藹蕴蘊兰蘭虑慮虚虛虫蟲虽雖虾蝦蚁蟻蚕蠶蜡蠟蝉蟬补補衬襯袜襪袭襲装裝裤褲见見观觀规規觅覓视視览覽觉覺亲親计計订訂认認讨討让讓训訓议議讯訊记記讲講讳諱讶訝讹訛论論讽諷设設访訪诀訣证證评評诅詛识識诈詐诉訴诊診词詞诏詔译譯试試诗詩诚誠话話诞誕询詢详詳语語误誤诱誘诲誨说說请請诺諾读讀课課谁誰调調谅諒谊誼谋謀谍諜谎謊谐諧谓謂谜謎谣謠谨謹谱譜猫貓贝貝负負财財责責贤賢败敗账賬货貨质質贩販贪貪贫貧贬貶购購贯貫贱賤贴貼贵貴贷貸贸貿贼賊贿賄资資赋賦赌賭赏賞赐賜赔賠赚賺赛賽赞贊赠贈赢贏赶趕趋趨跃躍践踐踪蹤躯軀轨軌转轉轮輪软軟轰轟轻輕载載较較辅輔辆輛辈輩辉輝辑輯输輸辞辭辩辯辽遼达達迁遷过過迈邁运運还還这這进進远遠违違迟遲适適选選逊遜递遞遗遺遥遙邮郵邻鄰释釋针針钓釣钗釵钢鋼钦欽铃鈴铁鐵铂鉑钻鑽银銀铜銅铭銘铮錚铺鋪链鏈销銷锁鎖错錯锡錫锦錦键鍵锤錘镇鎮镜鏡锋鋒锐銳长長门門闪閃闭閉问問闲閒间間闷悶闹鬧阁閣阅閱阔闊闯闖阳陽阴陰阵陣阶階际際险險随隨隐隱难難雏雛雾霧韵韻响響页頁顶頂顺順须須顽頑顾顧顿頓颂頌预預领領频頻颗顆题題额額颠顛颤顫类類风風飘飄飞飛饭飯饮飲馆館驰馳驱驅驶駛驻駐驾駕骄驕验驗骏駿骑騎骚騷骤驟鲜鮮鲸鯨鸟鳥鸣鳴鸿鴻鸽鴿鹅鵝鹊鵲鹏鵬鹤鶴鹰鷹麦麥黄黃齐齊龄齡龙龍';

const S2T_MAP: Record<string, string> = {};
for (let i = 0; i < S2T_PAIRS.length - 1; i += 2) {
  const s = S2T_PAIRS[i];
  const t = S2T_PAIRS[i + 1];
  if (s !== t && !S2T_MAP[s]) {
    S2T_MAP[s] = t;
  }
}

export interface ArtistAliasEntry {
  trad: string;
  en: string;
}

/**
 * Top Mandopop, Cantopop, Indie, J-Pop, K-Pop & Western Pop artist bilingual aliases.
 * Keys are lowercase Simplified Chinese or popular Chinese nicknames.
 */
const ARTIST_ALIASES: Record<string, ArtistAliasEntry> = {
  // Mandopop & Cantopop Classics + Modern Stars
  孙燕姿: { trad: '孫燕姿', en: 'Stefanie Sun' },
  周杰伦: { trad: '周杰倫', en: 'Jay Chou' },
  陈奕迅: { trad: '陳奕迅', en: 'Eason Chan' },
  林俊杰: { trad: '林俊傑', en: 'JJ Lin' },
  王菲: { trad: '王菲', en: 'Faye Wong' },
  邓紫棋: { trad: '鄧紫棋', en: 'G.E.M.' },
  蔡依林: { trad: '蔡依林', en: 'Jolin Tsai' },
  张学友: { trad: '張學友', en: 'Jacky Cheung' },
  张惠妹: { trad: '張惠妹', en: 'aMEI' },
  梁静茹: { trad: '梁靜茹', en: 'Fish Leong' },
  五月天: { trad: '五月天', en: 'Mayday' },
  陶喆: { trad: '陶喆', en: 'David Tao' },
  方大同: { trad: '方大同', en: 'Khalil Fong' },
  田馥甄: { trad: '田馥甄', en: 'Hebe Tien' },
  林宥嘉: { trad: '林宥嘉', en: 'Yoga Lin' },
  王力宏: { trad: '王力宏', en: 'Leehom Wang' },
  蔡健雅: { trad: '蔡健雅', en: 'Tanya Chua' },
  莫文蔚: { trad: '莫文蔚', en: 'Karen Mok' },
  刘若英: { trad: '劉若英', en: 'Rene Liu' },
  张国荣: { trad: '張國榮', en: 'Leslie Cheung' },
  刘德华: { trad: '劉德華', en: 'Andy Lau' },
  郭富城: { trad: '郭富城', en: 'Aaron Kwok' },
  黎明: { trad: '黎明', en: 'Leon Lai' },
  张韶涵: { trad: '張韶涵', en: 'Angela Zhang' },
  杨丞琳: { trad: '楊丞琳', en: 'Rainie Yang' },
  徐佳莹: { trad: '徐佳瑩', en: 'LaLa Hsu' },
  萧敬腾: { trad: '蕭敬騰', en: 'Jam Hsiao' },
  潘玮柏: { trad: '潘瑋柏', en: 'Will Pan' },
  萧亚轩: { trad: '蕭亞軒', en: 'Elva Hsiao' },
  戴佩妮: { trad: '戴佩妮', en: 'Penny Tai' },
  范玮琪: { trad: '范瑋琪', en: 'Christine Fan' },
  张信哲: { trad: '張信哲', en: 'Jeff Chang' },
  任贤齐: { trad: '任賢齊', en: 'Richie Jen' },
  伍佰: { trad: '伍佰', en: 'Wu Bai' },
  李宗盛: { trad: '李宗盛', en: 'Jonathan Lee' },
  罗大佑: { trad: '羅大佑', en: 'Lo Ta-Yu' },
  苏打绿: { trad: '蘇打綠', en: 'Sodagreen' },
  吴青峰: { trad: '吳青峰', en: 'Wu Qing-Feng' },
  陈绮贞: { trad: '陳綺貞', en: 'Cheer Chen' },
  薛之谦: { trad: '薛之謙', en: 'Joker Xue' },
  毛不易: { trad: '毛不易', en: 'Mao Buyi' },
  李荣浩: { trad: '李榮浩', en: 'Ronghao Li' },
  周深: { trad: '周深', en: 'Zhou Shen' },
  华晨宇: { trad: '華晨宇', en: 'Hua Chenyu' },
  林忆莲: { trad: '林憶蓮', en: 'Sandy Lam' },
  杨千嬅: { trad: '楊千嬅', en: 'Miriam Yeung' },
  容祖儿: { trad: '容祖兒', en: 'Joey Yung' },
  张敬轩: { trad: '張敬軒', en: 'Hins Cheung' },
  古巨基: { trad: '古巨基', en: 'Leo Ku' },
  谭咏麟: { trad: '譚詠麟', en: 'Alan Tam' },
  谢霆锋: { trad: '謝霆鋒', en: 'Nicholas Tse' },
  陈慧琳: { trad: '陳慧琳', en: 'Kelly Chen' },
  郑秀文: { trad: '鄭秀文', en: 'Sammi Cheng' },
  梅艳芳: { trad: '梅艷芳', en: 'Anita Mui' },
  黄家驹: { trad: '黃家駒', en: 'Beyond' },
  告五人: { trad: '告五人', en: 'Accusefive' },
  落日飞车: { trad: '落日飛車', en: 'Sunset Rollercoaster' },
  草东没有派对: { trad: '草東沒有派對', en: 'No Party For Cao Dong' },
  万能青年旅店: { trad: '萬能青年旅店', en: 'Omnipotent Youth Society' },
  房东的猫: { trad: '房東的貓', en: 'The Landlord’s Cat' },
  许巍: { trad: '許巍', en: 'Xu Wei' },
  朴树: { trad: '朴樹', en: 'Pu Shu' },
  赵雷: { trad: '趙雷', en: 'Zhao Lei' },
  李健: { trad: '李健', en: 'Li Jian' },
  汪苏泷: { trad: '汪蘇瀧', en: 'Silence Wang' },
  许嵩: { trad: '許嵩', en: 'Vae Xu' },
  张杰: { trad: '張傑', en: 'Jason Zhang' },
  单依纯: { trad: '單依純', en: 'Shan Yichun' },
  周兴哲: { trad: '周興哲', en: 'Eric Chou' },
  韦礼安: { trad: '韋禮安', en: 'WeiBird' },
  卢广仲: { trad: '盧廣仲', en: 'Crowd Lu' },
  魏如萱: { trad: '魏如萱', en: 'waa wei' },
  安溥: { trad: '安溥', en: 'anpu' },
  张悬: { trad: '張懸', en: 'Deserts Chang' },
  王心凌: { trad: '王心凌', en: 'Cyndi Wang' },
  飞儿乐团: { trad: '飛兒樂團', en: 'F.I.R.' },
  信乐团: { trad: '信樂團', en: 'Shin' },
  动力火车: { trad: '動力火車', en: 'Power Station' },
  羽泉: { trad: '羽泉', en: 'Yu Quan' },
  凤凰传奇: { trad: '鳳凰傳奇', en: 'Phoenix Legend' },
  刀郎: { trad: '刀郎', en: 'Dao Lang' },
  那英: { trad: '那英', en: 'Na Ying' },
  韩红: { trad: '韓紅', en: 'Han Hong' },
  孙楠: { trad: '孫楠', en: 'Sun Nan' },
  汪峰: { trad: '汪峰', en: 'Wang Feng' },
  郑钧: { trad: '鄭鈞', en: 'Zheng Jun' },
  窦唯: { trad: '竇唯', en: 'Dou Wei' },
  新裤子: { trad: '新褲子', en: 'New Pants' },
  逃跑计划: { trad: '逃跑計劃', en: 'Escape Plan' },
  陈粒: { trad: '陳粒', en: 'Chen Li' },

  // J-Pop & K-Pop
  坂本龙一: { trad: '坂本龍一', en: 'Ryuichi Sakamoto' },
  久石让: { trad: '久石讓', en: 'Joe Hisaishi' },
  米津玄师: { trad: '米津玄師', en: 'Kenshi Yonezu' },
  宇多田光: { trad: '宇多田光', en: 'Hikaru Utada' },
  藤井风: { trad: '藤井風', en: 'Fujii Kaze' },
  滨崎步: { trad: '濱崎步', en: 'Ayumi Hamasaki' },
  中岛美雪: { trad: '中島美雪', en: 'Miyuki Nakajima' },
  防弹少年团: { trad: '防彈少年團', en: 'BTS' },
  粉墨: { trad: 'BLACKPINK', en: 'BLACKPINK' },

  // Western Pop (Chinese names & popular nicknames!)
  泰勒斯威夫特: { trad: 'Taylor Swift', en: 'Taylor Swift' },
  泰勒: { trad: 'Taylor Swift', en: 'Taylor Swift' },
  霉霉: { trad: 'Taylor Swift', en: 'Taylor Swift' },
  比莉艾利什: { trad: 'Billie Eilish', en: 'Billie Eilish' },
  碧梨: { trad: 'Billie Eilish', en: 'Billie Eilish' },
  盆栽哥: { trad: 'The Weeknd', en: 'The Weeknd' },
  威肯: { trad: 'The Weeknd', en: 'The Weeknd' },
  火星哥: { trad: 'Bruno Mars', en: 'Bruno Mars' },
  黄老板: { trad: 'Ed Sheeran', en: 'Ed Sheeran' },
  阿黛尔: { trad: 'Adele', en: 'Adele' },
  酷玩乐队: { trad: 'Coldplay', en: 'Coldplay' },
  酷玩: { trad: 'Coldplay', en: 'Coldplay' },
  冷玩: { trad: 'Coldplay', en: 'Coldplay' },
  拉娜德雷: { trad: 'Lana Del Rey', en: 'Lana Del Rey' },
  打雷姐: { trad: 'Lana Del Rey', en: 'Lana Del Rey' },
  魔力红: { trad: 'Maroon 5', en: 'Maroon 5' },
  梦龙: { trad: 'Imagine Dragons', en: 'Imagine Dragons' },
  林肯公园: { trad: 'Linkin Park', en: 'Linkin Park' },
  披头士: { trad: 'The Beatles', en: 'The Beatles' },
  皇后乐队: { trad: 'Queen', en: 'Queen' },
  迈克尔杰克逊: { trad: 'Michael Jackson', en: 'Michael Jackson' },
  贾斯汀比伯: { trad: 'Justin Bieber', en: 'Justin Bieber' },
  比伯: { trad: 'Justin Bieber', en: 'Justin Bieber' },
  蕾哈娜: { trad: 'Rihanna', en: 'Rihanna' },
  碧昂丝: { trad: 'Beyoncé', en: 'Beyoncé' },
  a妹: { trad: 'Ariana Grande', en: 'Ariana Grande' },
  断眉: { trad: 'Charlie Puth', en: 'Charlie Puth' },
  烟鬼: { trad: 'The Chainsmokers', en: 'The Chainsmokers' },
  萌德: { trad: 'Shawn Mendes', en: 'Shawn Mendes' },
  侃爷: { trad: 'Kanye West', en: 'Kanye West' },
  德雷克: { trad: 'Drake', en: 'Drake' },
  水果姐: { trad: 'Katy Perry', en: 'Katy Perry' },
  戳爷: { trad: 'Troye Sivan', en: 'Troye Sivan' },
  啪姐: { trad: 'Dua Lipa', en: 'Dua Lipa' },
  牛姐: { trad: 'Mariah Carey', en: 'Mariah Carey' },
  席琳迪翁: { trad: 'Celine Dion', en: 'Celine Dion' },
  艾薇儿: { trad: 'Avril Lavigne', en: 'Avril Lavigne' },
  后街男孩: { trad: 'Backstreet Boys', en: 'Backstreet Boys' },
  西城男孩: { trad: 'Westlife', en: 'Westlife' },
  老鹰乐队: { trad: 'Eagles', en: 'Eagles' },
  绿洲乐队: { trad: 'Oasis', en: 'Oasis' },
};

// Pre-sort alias keys longest-first so "泰勒斯威夫特" matches before "泰勒"
const SORTED_ALIAS_KEYS = Object.keys(ARTIST_ALIASES).sort((a, b) => b.length - a.length);

export function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Converts Simplified Chinese characters to Traditional Chinese for Apple Music TW/HK/SG/US lookup
 * and cross-source deduplication.
 */
export function toTraditionalChinese(text: string): string {
  if (!text || !hasCjk(text)) return text;
  let out = '';
  for (const ch of text) {
    out += S2T_MAP[ch] || ch;
  }
  return out;
}

export interface ExpandedMusicQuery {
  /** Original cleaned query (e.g. "孙燕姿 逆光") */
  primary: string;
  /** Traditional Chinese query (e.g. "孫燕姿 逆光") */
  traditional: string;
  /** English / romanized alias variant if matched (e.g. "Stefanie Sun 逆光" or "Taylor Swift") */
  englishAlias: string | null;
  /** Whether the query contains CJK characters */
  isCjk: boolean;
}

/**
 * Expands a cleaned query into Simplified, Traditional, and English/Alias variants
 * so searching "孙燕姿 逆光", "逆光", "周杰伦", or "霉霉" hits ALL global catalogs.
 */
export function expandMusicQuery(cleaned: string): ExpandedMusicQuery {
  const primary = cleaned.trim();
  const lower = primary.toLowerCase();

  let trad = primary;
  let enAlias: string | null = null;

  for (const key of SORTED_ALIAS_KEYS) {
    const idx = lower.indexOf(key);
    if (idx !== -1) {
      const entry = ARTIST_ALIASES[key];
      const before = primary.slice(0, idx);
      const after = primary.slice(idx + key.length);
      trad = `${toTraditionalChinese(before)}${entry.trad}${toTraditionalChinese(after)}`.trim();
      const rest = `${before} ${after}`.trim();
      enAlias = rest ? `${entry.en} ${rest}` : entry.en;
      break;
    }
  }

  if (trad === primary) {
    trad = toTraditionalChinese(primary);
  }

  return {
    primary,
    traditional: trad,
    englishAlias: enAlias && enAlias.toLowerCase() !== primary.toLowerCase() ? enAlias : null,
    isCjk: hasCjk(primary),
  };
}

/**
 * Canonical deduplication key normalizing Simplified/Traditional & stripping parenthetical tags
 * like "(Remastered)", "(Live)", "（电影主题曲）".
 */
export function canonicalTrackKey(title: string, artist: string): string {
  const norm = (s: string) =>
    toTraditionalChinese(s)
      .toLowerCase()
      .replace(/\(.*?\)|（.*?）|\[.*?\]|【.*?】/g, '')
      .replace(/[^\w\u4e00-\u9fff]/g, '');

  // Map English artist names back to canonical Chinese key if known so "Stefanie Sun" == "孫燕姿"
  const normArtistRaw = norm(artist);
  let canonicalArtist = normArtistRaw;
  for (const key of SORTED_ALIAS_KEYS) {
    const entry = ARTIST_ALIASES[key];
    const enNorm = entry.en.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tradNorm = norm(entry.trad);
    if (normArtistRaw === enNorm || normArtistRaw === tradNorm) {
      canonicalArtist = tradNorm;
      break;
    }
  }

  return `${norm(title)}::${canonicalArtist}`;
}
