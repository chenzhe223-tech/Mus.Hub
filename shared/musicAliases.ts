/**
 * Shared Simplified -> Traditional Chinese converter + Mandopop / Cantopop / Western Pop / J-Pop
 * bilingual artist alias table + Iconic Mandopop Song Title Hints + External Music Deep Links.
 *
 * Used by BOTH Cloudflare Edge Worker and Browser Client so searching bare titles like
 * "逆光", "天黑黑", "开始懂了", "我怀念的", "晴天", "十年", or nicknames like "霉霉"
 * immediately hits full HK/TW/SG/CN/US/Global catalogs with 30s studio previews.
 */

const S2T_PAIRS =
  '开開关關风風云雲爱愛恋戀梦夢怀懷见見绿綠蓝藍红紅黄黃银銀金金灯燈影影画畫书書纸紙笔筆诗詩词詞声聲响響韵韻节節弹彈听聽说說语語话話谈談谁誰许許请請谢謝认認识識记記伤傷泪淚远遠过過來來时時間間们們个個为為这這么麼还還对對没沒点點边邊样樣实實现現经經欢歡乐樂离離别別归歸问問门門难難简簡单單复複杂雜极極温溫热熱阴陰雾霧叹嘆愿願寻尋遇遇错錯舍捨弃棄回回飞飛坠墜飘飄荡盪转轉变變换換旧舊长長满滿独獨双雙终終无無尽盡头頭际際东東国國镇鎮乡鄉桥橋墙牆楼樓阁閣厅廳馆館园園树樹叶葉兰蘭莲蓮樱櫻枫楓枣棗游遊戏戲剧劇场場镜鏡帧幀帘簾钟鐘表錶针針线線绳繩结結网網丝絲绸綢纱紗锦錦绣繡裙裙裤褲袜襪带帶环環链鏈钻鑽宝寶贝貝琼瓊瑶瑤玛瑪铁鐵铜銅锡錫铅鉛钢鋼锐銳锋鋒剑劍枪槍战戰斗鬥胜勝败敗输輸赢贏赛賽竞競争爭抢搶夺奪护護卫衛击擊断斷绝絕灭滅运運气氣灵靈龙龍凤鳳猫貓马馬猪豬鸡雞鸭鴨鹅鵝鸟鳥鸦鴉鹊鵲鹰鷹鹤鶴鸽鴿鸥鷗莺鶯蝶蝶蝉蟬萤螢鱼魚鲸鯨鲨鯊龟龜鳖鱉虾蝦虫蟲蚁蟻蚊蚊蝇蠅狮獅驼駝驴驢骡騾岁歲湾灣岛島屿嶼峡峽岭嶺尘塵滩灘滨濱舱艙航航车車轮輪轨軌机機亲親侣侶爷爺儿兒师師学學课課写寫读讀录錄编編辑輯译譯注註释釋证證据據论論义義觉覺绪緒态態脑腦脸臉颜顏齿齒发發须鬚颈頸脚腳体體躯軀脉脈肤膚脏臟胆膽肠腸肾腎疮瘡药藥医醫疗療愈癒强強壮壯丽麗丑醜恶惡坏壞伪偽虚虛丰豐贫貧穷窮贵貴贱賤轻輕缓緩迟遲暂暫恒恆区區层層级級阶階队隊众眾伙夥团團会會党黨帮幫军軍将將帅帥后後仆僕敌敵贼賊盗盜骗騙谎謊谜謎隐隱显顯闭閉锁鎖钥鑰条條块塊颗顆缕縷阵陣号號码碼数數唤喚咏詠应應诺諾约約凭憑赖賴托託给給赠贈递遞传傳播播拥擁搂摟搀攙挤擠压壓扫掃涤滌冲沖浇澆洒灑泼潑溅濺渗滲涌湧涨漲潜潛跃躍迈邁驰馳驱驅赶趕闪閃摇搖摆擺动動静靜睁睜赏賞览覽阅閱闻聞尝嘗饮飲孙孫伦倫杰傑张張陈陳刘劉杨楊赵趙吴吳郑鄭冯馮吕呂严嚴华華邹鄒窦竇苏蘇卢盧鲍鮑费費贺賀汤湯罗羅毕畢邬鄔萧蕭庞龐纪紀项項闵閔贾賈娄婁钟鍾万萬邓鄧诸諸钮鈕龚龔陆陸荣榮储儲乌烏宁寧栾欒厉厲蓟薊从從蔺藺乔喬苍蒼党黨谭譚贡貢劳勞郦酈却卻寿壽农農庄莊阎閻连連习習广廣禄祿阙闕欧歐巩鞏聂聶阚闞饶饒养養权權盖蓋绮綺贞貞莹瑩玮瑋轩軒谦謙亿億忆憶桦樺仪儀凯凱伟偉约約续續绕繞绘繪缘緣维維绵綿绚絢绽綻绯緋织織纯純纷紛纺紡纳納纽紐纬緯练練组組绅紳绊絆绍紹驿驛绑綁绒絨娇嬌娆嬈娱娛娴嫻婵嬋婴嬰宠寵审審宽寬宾賓导導届屆属屬岂豈岗崗巅巔币幣帐帳帜幟庆慶庙廟废廢异異弥彌弯彎当當彻徹径徑忧憂怅悵怜憐总總恳懇恼惱悬懸悯憫惊驚惧懼惨慘惯慣愤憤懒懶户戶扑撲执執扩擴扬揚扰擾抚撫抛拋报報担擔拟擬拨撥择擇挂掛挚摯挡擋挣掙挥揮捞撈损損捡撿捣搗撑撐攒攢敛斂斋齋旷曠晓曉晕暈胧朧术術杀殺构構标標栈棧栋棟栏欄栖棲检檢历歷残殘殇殤氢氫汇匯汉漢汹洶沧滄沪滬泽澤洁潔浅淺浊濁测測济濟浏瀏浑渾浓濃涂塗涛濤涟漣涡渦焕煥涤滌润潤涩澀渊淵渐漸渔漁湿濕溃潰滚滾滤濾滥濫澜瀾灾災灿燦炉爐炽熾烁爍烂爛烟煙烦煩烧燒牵牽犹猶狭狹猎獵献獻兽獸产產亩畝畅暢叠疊疯瘋痴癡皱皺盏盞监監盘盤瞩矚矫矯矿礦砖磚砚硯礼禮祸禍禅禪种種称稱稳穩窝窩窥窺筝箏篮籃篱籬粤粵紧緊繁繁纤纖纲綱纹紋络絡绞絞统統绢絹继繼绩績绰綽绷繃综綜缀綴缅緬缔締缝縫缠纏缩縮缴繳罚罰罢罷羁羈羡羨联聯聪聰职職肃肅胶膠脱脫腊臘腾騰卧臥临臨兴興举舉舰艦艰艱艳艷艺藝芦蘆荐薦获獲萨薩著著蒋蔣蔷薔蔼藹蕴蘊虑慮虽雖蚕蠶蜡蠟补補衬襯袭襲装裝观觀规規觅覓视視计計订訂讨討让讓训訓议議讯訊讲講讳諱讶訝讹訛讽諷设設访訪诀訣评評诅詛诈詐诉訴诊診诏詔试試诚誠诞誕询詢详詳误誤诱誘诲誨调調谅諒谊誼谋謀谍諜谐諧谓謂谣謠谨謹谱譜负負财財责責贤賢账賬货貨质質贩販贪貪贬貶购購贯貫贴貼贷貸贸貿贿賄资資赋賦赌賭赐賜赔賠赚賺赞贊趋趨践踐踪蹤软軟轰轟载載较較辅輔辆輛辈輩辉輝辞辭辩辯辽遼达達迁遷违違适適选選逊遜遗遺遥遙邮郵邻鄰钓釣钗釵钦欽铃鈴铂鉑铭銘铮錚铺鋪销銷错錯锦錦键鍵锤錘镇鎮闲閒闷悶闹鬧阔闊闯闖阵陣险險随隨雏雛页頁顶頂顺順顽頑顾顧顿頓颂頌预預领領频頻题題额額颠顛颤顫类類饭飯驰馳驶駛驻駐驾駕骄驕验驗骏駿骑騎骚騷骤驟鲜鮮鸣鳴鸿鴻麦麥齐齊龄齡';

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

const ARTIST_ALIASES: Record<string, ArtistAliasEntry> = {
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
  凤凰传奇: { trad: '鳳凰傳奇', en: 'Phoenix Legend' },
  那英: { trad: '那英', en: 'Na Ying' },
  韩红: { trad: '韓紅', en: 'Han Hong' },
  孙楠: { trad: '孫楠', en: 'Sun Nan' },
  汪峰: { trad: '汪峰', en: 'Wang Feng' },
  陈粒: { trad: '陳粒', en: 'Chen Li' },
  坂本龙一: { trad: '坂本龍一', en: 'Ryuichi Sakamoto' },
  久石让: { trad: '久石讓', en: 'Joe Hisaishi' },
  米津玄师: { trad: '米津玄師', en: 'Kenshi Yonezu' },
  宇多田光: { trad: '宇多田光', en: 'Hikaru Utada' },
  藤井风: { trad: '藤井風', en: 'Fujii Kaze' },
  防弹少年团: { trad: '防彈少年團', en: 'BTS' },
  粉墨: { trad: 'BLACKPINK', en: 'BLACKPINK' },
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

/**
 * Iconic Mandopop/Cantopop bare song-title -> canonical artist hint.
 * When a user searches ONLY "逆光", "天黑黑", or "开始懂了" without typing the artist name,
 * global catalogs often bury the original classic under indie covers or anime tracks;
 * adding the canonical Traditional + English artist hint puts the real classic right at #1!
 */
const SONG_TITLE_HINTS: Record<string, { trad: string; en: string }> = {
  逆光: { trad: '孫燕姿 逆光', en: 'Stefanie Sun 逆光' },
  天黑黑: { trad: '孫燕姿 天黑黑', en: 'Stefanie Sun 天黑黑' },
  开始懂了: { trad: '孫燕姿 開始懂了', en: 'Stefanie Sun 開始懂了' },
  開始懂了: { trad: '孫燕姿 開始懂了', en: 'Stefanie Sun 開始懂了' },
  我怀念的: { trad: '孫燕姿 我懷念的', en: 'Stefanie Sun 我懷念的' },
  遇见: { trad: '孫燕姿 遇見', en: 'Stefanie Sun 遇見' },
  绿光: { trad: '孫燕姿 綠光', en: 'Stefanie Sun 綠光' },
  克卜勒: { trad: '孫燕姿 克卜勒', en: 'Stefanie Sun 克卜勒' },
  我不难过: { trad: '孫燕姿 我不難過', en: 'Stefanie Sun 我不難過' },
  雨天: { trad: '孫燕姿 雨天', en: 'Stefanie Sun 雨天' },
  同类: { trad: '孫燕姿 同類', en: 'Stefanie Sun 同類' },
  我要的幸福: { trad: '孫燕姿 我要的幸福', en: 'Stefanie Sun 我要的幸福' },
  眼泪成诗: { trad: '孫燕姿 眼淚成詩', en: 'Stefanie Sun 眼淚成詩' },
  晴天: { trad: '周杰倫 晴天', en: 'Jay Chou 晴天' },
  七里香: { trad: '周杰倫 七里香', en: 'Jay Chou 七里香' },
  夜曲: { trad: '周杰倫 夜曲', en: 'Jay Chou 夜曲' },
  稻香: { trad: '周杰倫 稻香', en: 'Jay Chou 稻香' },
  青花瓷: { trad: '周杰倫 青花瓷', en: 'Jay Chou 青花瓷' },
  告白气球: { trad: '周杰倫 告白氣球', en: 'Jay Chou 告白氣球' },
  搁浅: { trad: '周杰倫 擱淺', en: 'Jay Chou 擱淺' },
  一路向北: { trad: '周杰倫 一路向北', en: 'Jay Chou 一路向北' },
  十年: { trad: '陳奕迅 十年', en: 'Eason Chan 十年' },
  浮夸: { trad: '陳奕迅 浮誇', en: 'Eason Chan 浮誇' },
  富士山下: { trad: '陳奕迅 富士山下', en: 'Eason Chan 富士山下' },
  爱情转移: { trad: '陳奕迅 愛情轉移', en: 'Eason Chan 愛情轉移' },
  红玫瑰: { trad: '陳奕迅 紅玫瑰', en: 'Eason Chan 紅玫瑰' },
  孤勇者: { trad: '陳奕迅 孤勇者', en: 'Eason Chan 孤勇者' },
  红豆: { trad: '王菲 紅豆', en: 'Faye Wong 紅豆' },
  匆匆那年: { trad: '王菲 匆匆那年', en: 'Faye Wong 匆匆那年' },
  江南: { trad: '林俊傑 江南', en: 'JJ Lin 江南' },
  修炼爱情: { trad: '林俊傑 修煉愛情', en: 'JJ Lin 修煉愛情' },
  不为谁而作的歌: { trad: '林俊傑 不為誰而作的歌', en: 'JJ Lin' },
  泡沫: { trad: '鄧紫棋 泡沫', en: 'G.E.M. 泡沫' },
  光年之外: { trad: '鄧紫棋 光年之外', en: 'G.E.M. 光年之外' },
  喜欢你: { trad: '鄧紫棋 喜歡你', en: 'G.E.M. 喜歡你' },
  突然好想你: { trad: '五月天 突然好想你', en: 'Mayday 突然好想你' },
  温柔: { trad: '五月天 溫柔', en: 'Mayday 溫柔' },
  知足: { trad: '五月天 知足', en: 'Mayday 知足' },
  小幸运: { trad: '田馥甄 小幸運', en: 'Hebe Tien 小幸運' },
  魔鬼中的天使: { trad: '田馥甄 魔鬼中的天使', en: 'Hebe Tien' },
  说谎: { trad: '林宥嘉 說謊', en: 'Yoga Lin 說謊' },
  成全: { trad: '林宥嘉 成全', en: 'Yoga Lin 成全' },
  后来: { trad: '劉若英 後來', en: 'Rene Liu 後來' },
  勇气: { trad: '梁靜茹 勇氣', en: 'Fish Leong 勇氣' },
  可惜不是你: { trad: '梁靜茹 可惜不是你', en: 'Fish Leong 可惜不是你' },
  暖暖: { trad: '梁靜茹 暖暖', en: 'Fish Leong 暖暖' },
  爱爱爱: { trad: '方大同 愛愛愛', en: 'Khalil Fong 愛愛愛' },
  三人游: { trad: '方大同 三人遊', en: 'Khalil Fong 三人遊' },
  特别的人: { trad: '方大同 特別的人', en: 'Khalil Fong 特別的人' },
  普通朋友: { trad: '陶喆 普通朋友', en: 'David Tao 普通朋友' },
  爱很简单: { trad: '陶喆 愛很簡單', en: 'David Tao 愛很簡單' },
  流沙: { trad: '陶喆 流沙', en: 'David Tao 流沙' },
  吻别: { trad: '張學友 吻別', en: 'Jacky Cheung 吻別' },
  海阔天空: { trad: 'Beyond 海闊天空', en: 'Beyond 海闊天空' },
  真的爱你: { trad: 'Beyond 真的愛你', en: 'Beyond 真的愛你' },
  起风了: { trad: '買辣椒也用券 起風了', en: '起風了' },
  平凡之路: { trad: '朴樹 平凡之路', en: 'Pu Shu 平凡之路' },
  蓝莲花: { trad: '許巍 藍蓮花', en: 'Xu Wei 藍蓮花' },
  曾经的你: { trad: '許巍 曾經的你', en: 'Xu Wei 曾經的你' },
  消愁: { trad: '毛不易 消愁', en: 'Mao Buyi 消愁' },
  演员: { trad: '薛之謙 演員', en: 'Joker Xue 演員' },
  体面: { trad: '于文文 體面', en: 'Kelly Yu 體面' },
  大鱼: { trad: '周深 大魚', en: 'Zhou Shen 大魚' },
  大风吹: { trad: '草東沒有派對 大風吹', en: 'No Party For Cao Dong' },
  披星戴月的想你: { trad: '告五人 披星戴月的想你', en: 'Accusefive' },
  爱人错过: { trad: '告五人 愛人錯過', en: 'Accusefive' },
  旅行的意义: { trad: '陳綺貞 旅行的意義', en: 'Cheer Chen' },
  盛夏的果实: { trad: '莫文蔚 盛夏的果實', en: 'Karen Mok' },
  红色高跟鞋: { trad: '蔡健雅 紅色高跟鞋', en: 'Tanya Chua' },
  倒带: { trad: '蔡依林 倒帶', en: 'Jolin Tsai 倒帶' },
  日不落: { trad: '蔡依林 日不落', en: 'Jolin Tsai 日不落' },
  隐形的翅膀: { trad: '張韶涵 隱形的翅膀', en: 'Angela Zhang' },
  小情歌: { trad: '蘇打綠 小情歌', en: 'Sodagreen 小情歌' },
};

const SORTED_ALIAS_KEYS = Object.keys(ARTIST_ALIASES).sort((a, b) => b.length - a.length);

export function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

export function toTraditionalChinese(text: string): string {
  if (!text || !hasCjk(text)) return text;
  let out = '';
  for (const ch of text) {
    out += S2T_MAP[ch] || ch;
  }
  return out;
}

export interface ExpandedMusicQuery {
  primary: string;
  traditional: string;
  englishAlias: string | null;
  songHintTrad: string | null;
  songHintEn: string | null;
  isCjk: boolean;
}

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

  // Check bare classic song title hints (e.g. "逆光", "天黑黑", "开始懂了")
  const exactHint = SONG_TITLE_HINTS[primary] || SONG_TITLE_HINTS[trad] || null;

  return {
    primary,
    traditional: trad,
    englishAlias:
      enAlias && enAlias.toLowerCase() !== primary.toLowerCase()
        ? enAlias
        : exactHint?.en || null,
    songHintTrad: exactHint?.trad || null,
    songHintEn: exactHint?.en || null,
    isCjk: hasCjk(primary),
  };
}

export function canonicalTrackKey(title: string, artist: string): string {
  const norm = (s: string) =>
    toTraditionalChinese(s)
      .toLowerCase()
      .replace(/\(.*?\)|（.*?）|\[.*?\]|【.*?】/g, '')
      .replace(/[^\w\u4e00-\u9fff]/g, '');

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

export interface ExternalMusicLinks {
  netease: string;
  qq: string;
  apple: string;
  spotify: string;
}

/**
 * Generates direct external links to listen to the FULL song on NetEase, QQ Music, Apple Music & Spotify.
 */
export function buildExternalMusicLinks(
  title: string,
  artist: string,
  opts?: {
    neteaseId?: string;
    qqMid?: string;
    appleUrl?: string;
    spotifyUrl?: string;
  }
): ExternalMusicLinks {
  const cleanTitle = title.replace(/\(.*?\)|（.*?）/g, '').trim() || title.trim();
  const query = `${cleanTitle} ${artist}`.trim();
  const enc = encodeURIComponent(query);

  return {
    netease: opts?.neteaseId
      ? `https://music.163.com/#/song?id=${encodeURIComponent(opts.neteaseId)}`
      : `https://music.163.com/#/search/m/?s=${enc}&type=1`,
    qq: opts?.qqMid
      ? `https://y.qq.com/n/ryqq/songDetail/${encodeURIComponent(opts.qqMid)}`
      : `https://y.qq.com/n/ryqq/search?w=${enc}`,
    apple:
      opts?.appleUrl && opts.appleUrl.includes('music.apple.com')
        ? opts.appleUrl
        : `https://music.apple.com/search?term=${enc}`,
    spotify:
      opts?.spotifyUrl && opts.spotifyUrl.includes('spotify.com')
        ? opts.spotifyUrl
        : `https://open.spotify.com/search/${enc}`,
  };
}
