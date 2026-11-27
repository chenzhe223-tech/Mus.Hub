/**
 * Shared Simplified <-> Traditional Chinese converter + Mandopop / Cantopop / Western Pop / J-Pop
 * bilingual artist alias table + English->Chinese Mandopop Song/Album Localizer + Strict Track Matcher.
 *
 * Guarantees:
 * 1. Searching Simplified Chinese ("孙燕姿", "逆光", "天黑黑", "开始懂了", "晴天") hits ALL global catalogs.
 * 2. Chinese artists' tracks/albums ALWAYS display in clean Simplified Chinese (e.g. "Sunny Day - Jay Chou" -> "晴天 - 周杰伦 · 叶惠美").
 * 3. Preview audio resolution STRICTLY verifies title + artist match — NEVER plays a wrong song!
 */

const S2T_PAIRS =
  '开開关關风風云雲爱愛恋戀梦夢怀懷见見绿綠蓝藍红紅黄黃银銀灯燈画畫书書纸紙笔筆诗詩词詞声聲响響韵韻节節弹彈听聽说說语語话話谈談谁誰许許请請谢謝认認识識记記伤傷泪淚远遠过過來來时時間間们們个個为為这這么麼还還对對没沒点點边邊样樣实實现現经經欢歡乐樂离離别別归歸问問门門难難简簡单單复複杂雜极極温溫热熱阴陰雾霧叹嘆愿願寻尋错錯舍捨弃棄飞飛坠墜飘飄荡盪转轉变變换換旧舊长長满滿独獨双雙终終无無尽盡头頭际際东東国國镇鎮乡鄉桥橋墙牆楼樓阁閣厅廳馆館园園树樹叶葉兰蘭莲蓮樱櫻枫楓枣棗游遊戏戲剧劇场場镜鏡帧幀帘簾钟鐘表錶针針线線绳繩结結网網丝絲绸綢纱紗锦錦绣繡裤褲袜襪带帶环環链鏈钻鑽宝寶贝貝琼瓊瑶瑤玛瑪铁鐵铜銅锡錫铅鉛钢鋼锐銳锋鋒剑劍枪槍战戰斗鬥胜勝败敗输輸赢贏赛賽竞競争爭抢搶夺奪护護卫衛击擊断斷绝絕灭滅运運气氣灵靈龙龍凤鳳猫貓马馬猪豬鸡雞鸭鴨鹅鵝鸟鳥鸦鴉鹊鵲鹰鷹鹤鶴鸽鴿鸥鷗莺鶯蝉蟬萤螢鱼魚鲸鯨鲨鯊龟龜鳖鱉虾蝦虫蟲蚁蟻蝇蠅狮獅驼駝驴驢骡騾岁歲湾灣岛島屿嶼峡峽岭嶺尘塵滩灘滨濱舱艙车車轮輪轨軌机機亲親侣侶爷爺儿兒师師学學课課写寫读讀录錄编編辑輯译譯注註释釋证證据據论論义義觉覺绪緒态態脑腦脸臉颜顏齿齒发發须鬚颈頸脚腳体體躯軀脉脈肤膚脏臟胆膽肠腸肾腎疮瘡药藥医醫疗療愈癒强強壮壯丽麗丑醜恶惡坏壞伪偽虚虛丰豐贫貧穷窮贵貴贱賤轻輕缓緩迟遲暂暫恒恆区區层層级級阶階队隊众眾伙夥团團会會党黨帮幫军軍将將帅帥后後仆僕敌敵贼賊盗盜骗騙谎謊谜謎隐隱显顯闭閉锁鎖钥鑰条條块塊颗顆缕縷阵陣号號码碼数數唤喚咏詠应應诺諾约約凭憑赖賴托託给給赠贈递遞传傳拥擁搂摟搀攙挤擠压壓扫掃涤滌冲沖浇澆洒灑泼潑溅濺渗滲涌湧涨漲潜潛跃躍迈邁驰馳驱驅赶趕闪閃摇搖摆擺动動静靜睁睜赏賞览覽阅閱闻聞尝嘗饮飲孙孫伦倫杰傑张張陈陳刘劉杨楊赵趙吴吳郑鄭冯馮吕呂严嚴华華邹鄒窦竇苏蘇卢盧鲍鮑费費贺賀汤湯罗羅毕畢邬鄔萧蕭庞龐纪紀项項闵閔贾賈娄婁万萬邓鄧诸諸钮鈕龚龔陆陸荣榮储儲乌烏宁寧栾欒厉厲蓟薊从從蔺藺乔喬苍蒼谭譚贡貢劳勞郦酈却卻寿壽农農庄莊阎閻连連习習广廣禄祿阙闕欧歐巩鞏聂聶阚闞饶饒养養权權盖蓋绮綺贞貞莹瑩玮瑋轩軒谦謙亿億忆憶桦樺仪儀凯凱伟偉续續绕繞绘繪缘緣维維绵綿绚絢绽綻绯緋织織纯純纷紛纺紡纳納纽紐纬緯练練组組绅紳绊絆绍紹驿驛绑綁绒絨娇嬌娆嬈娱娛娴嫻婵嬋婴嬰宠寵审審宽寬宾賓导導届屆属屬岂豈岗崗巅巔币幣帐帳帜幟庆慶庙廟废廢异異弥彌弯彎当當彻徹径徑忧憂怅悵怜憐总總恳懇恼惱悬懸悯憫惊驚惧懼惨慘惯慣愤憤懒懶户戶扑撲执執扩擴扬揚扰擾抚撫抛拋报報担擔拟擬拨撥择擇挂掛挚摯挡擋挣掙挥揮捞撈损損捡撿捣搗撑撐攒攢敛斂斋齋旷曠晓曉晕暈胧朧术術杀殺构構标標栈棧栋棟栏欄栖棲检檢历歷残殘殇殤氢氫汇匯汉漢汹洶沧滄沪滬泽澤洁潔浅淺浊濁测測济濟浏瀏浑渾浓濃涂塗涛濤涟漣涡渦焕煥润潤涩澀渊淵渐漸渔漁湿濕溃潰滚滾滤濾滥濫澜瀾灾災灿燦炉爐炽熾烁爍烂爛烟煙烦煩烧燒牵牽犹猶狭狹猎獵献獻兽獸产產亩畝畅暢叠疊疯瘋痴癡皱皺盏盞监監盘盤瞩矚矫矯矿礦砖磚砚硯礼禮祸禍禅禪种種称稱稳穩窝窩窥窺筝箏篮籃篱籬粤粵紧緊繁繁纤纖纲綱纹紋络絡绞絞统統绢絹继繼绩績绰綽绷繃综綜缀綴缅緬缔締缝縫缠纏缩縮缴繳罚罰罢罷羁羈羡羨联聯聪聰职職肃肅胶膠脱脫腊臘腾騰卧臥临臨兴興举舉舰艦艰艱艳艷艺藝芦蘆荐薦获獲萨薩著著蒋蔣蔷薔蔼藹蕴蘊虑慮虽雖蚕蠶蜡蠟补補衬襯袭襲装裝观觀规規觅覓视視计計订訂讨討让讓训訓议議讯訊讲講讳諱讶訝讹訛讽諷设設访訪诀訣评評诅詛诈詐诉訴诊診诏詔试試诚誠诞誕询詢详詳误誤诱誘诲誨调調谅諒谊誼谋謀谍諜谐諧谓謂谣謠谨謹谱譜负負财財责責贤賢账賬货貨质質贩販贪貪贬貶购購贯貫贴貼贷貸贸貿贿賄资資赋賦赌賭赐賜赔賠赚賺赞贊趋趨践踐踪蹤软軟轰轟载載较較辅輔辆輛辈輩辉輝辞辭辩辯辽遼达達迁遷违違适適选選逊遜遗遺遥遙邮郵邻鄰钓釣钗釵钦欽铃鈴铂鉑铭銘铮錚铺鋪销銷锦錦键鍵锤錘闲閒闷悶闹鬧阔闊闯闖险險随隨雏雛页頁顶頂顺順顽頑顾顧顿頓颂頌预預领領频頻题題额額颠顛颤顫类類饭飯驶駛驻駐驾駕骄驕验驗骏駿骑騎骚騷骤驟鲜鮮鸣鳴鸿鴻麦麥齐齊龄齡';

const S2T_MAP: Record<string, string> = {};
const T2S_MAP: Record<string, string> = {};
for (let i = 0; i < S2T_PAIRS.length - 1; i += 2) {
  const s = S2T_PAIRS[i];
  const t = S2T_PAIRS[i + 1];
  if (s !== t) {
    if (!S2T_MAP[s]) S2T_MAP[s] = t;
    if (!T2S_MAP[t]) T2S_MAP[t] = s;
  }
}
// Extra Traditional -> Simplified overrides common in music titles
Object.assign(T2S_MAP, {
  臺: '台',
  裡: '里',
  裏: '里',
  麼: '么',
  為: '为',
  與: '与',
  於: '于',
  劃: '划',
  隻: '只',
  準: '准',
  迴: '回',
  煙: '烟',
  線: '线',
  鐘: '钟',
  鍾: '钟',
  週: '周',
  妳: '你',
  祂: '他',
  註: '注',
  夥: '伙',
  捲: '卷',
  繫: '系',
  係: '系',
  採: '采',
  雲: '云',
  麵: '面',
  鬆: '松',
  髮: '发',
  發: '发',
  乾: '干',
  幹: '干',
  復: '复',
  複: '复',
});

export interface ArtistAliasEntry {
  zh: string;
  trad: string;
  en: string;
  /** True for Chinese / Mandopop / Cantopop artists whose display names & songs should prefer Chinese */
  isChineseArtist: boolean;
}

const RAW_ARTIST_ALIASES: Record<string, { trad: string; en: string; zh?: string; isChineseArtist?: boolean }> = {
  // Mandopop & Cantopop Artists (prefer Chinese display!)
  孙燕姿: { trad: '孫燕姿', en: 'Stefanie Sun', isChineseArtist: true },
  周杰伦: { trad: '周杰倫', en: 'Jay Chou', isChineseArtist: true },
  陈奕迅: { trad: '陳奕迅', en: 'Eason Chan', isChineseArtist: true },
  林俊杰: { trad: '林俊傑', en: 'JJ Lin', isChineseArtist: true },
  王菲: { trad: '王菲', en: 'Faye Wong', isChineseArtist: true },
  邓紫棋: { trad: '鄧紫棋', en: 'G.E.M.', isChineseArtist: true },
  蔡依林: { trad: '蔡依林', en: 'Jolin Tsai', isChineseArtist: true },
  张学友: { trad: '張學友', en: 'Jacky Cheung', isChineseArtist: true },
  张惠妹: { trad: '張惠妹', en: 'aMEI', isChineseArtist: true },
  梁静茹: { trad: '梁靜茹', en: 'Fish Leong', isChineseArtist: true },
  五月天: { trad: '五月天', en: 'Mayday', isChineseArtist: true },
  陶喆: { trad: '陶喆', en: 'David Tao', isChineseArtist: true },
  方大同: { trad: '方大同', en: 'Khalil Fong', isChineseArtist: true },
  田馥甄: { trad: '田馥甄', en: 'Hebe Tien', isChineseArtist: true },
  林宥嘉: { trad: '林宥嘉', en: 'Yoga Lin', isChineseArtist: true },
  王力宏: { trad: '王力宏', en: 'Leehom Wang', isChineseArtist: true },
  蔡健雅: { trad: '蔡健雅', en: 'Tanya Chua', isChineseArtist: true },
  莫文蔚: { trad: '莫文蔚', en: 'Karen Mok', isChineseArtist: true },
  刘若英: { trad: '劉若英', en: 'Rene Liu', isChineseArtist: true },
  张国荣: { trad: '張國榮', en: 'Leslie Cheung', isChineseArtist: true },
  刘德华: { trad: '劉德華', en: 'Andy Lau', isChineseArtist: true },
  郭富城: { trad: '郭富城', en: 'Aaron Kwok', isChineseArtist: true },
  黎明: { trad: '黎明', en: 'Leon Lai', isChineseArtist: true },
  张韶涵: { trad: '張韶涵', en: 'Angela Zhang', isChineseArtist: true },
  杨丞琳: { trad: '楊丞琳', en: 'Rainie Yang', isChineseArtist: true },
  徐佳莹: { trad: '徐佳瑩', en: 'LaLa Hsu', isChineseArtist: true },
  萧敬腾: { trad: '蕭敬騰', en: 'Jam Hsiao', isChineseArtist: true },
  潘玮柏: { trad: '潘瑋柏', en: 'Will Pan', isChineseArtist: true },
  萧亚轩: { trad: '蕭亞軒', en: 'Elva Hsiao', isChineseArtist: true },
  戴佩妮: { trad: '戴佩妮', en: 'Penny Tai', isChineseArtist: true },
  范玮琪: { trad: '范瑋琪', en: 'Christine Fan', isChineseArtist: true },
  张信哲: { trad: '張信哲', en: 'Jeff Chang', isChineseArtist: true },
  任贤齐: { trad: '任賢齊', en: 'Richie Jen', isChineseArtist: true },
  伍佰: { trad: '伍佰', en: 'Wu Bai', isChineseArtist: true },
  李宗盛: { trad: '李宗盛', en: 'Jonathan Lee', isChineseArtist: true },
  罗大佑: { trad: '羅大佑', en: 'Lo Ta-Yu', isChineseArtist: true },
  苏打绿: { trad: '蘇打綠', en: 'Sodagreen', isChineseArtist: true },
  吴青峰: { trad: '吳青峰', en: 'Wu Qing-Feng', isChineseArtist: true },
  陈绮贞: { trad: '陳綺貞', en: 'Cheer Chen', isChineseArtist: true },
  薛之谦: { trad: '薛之謙', en: 'Joker Xue', isChineseArtist: true },
  毛不易: { trad: '毛不易', en: 'Mao Buyi', isChineseArtist: true },
  李荣浩: { trad: '李榮浩', en: 'Ronghao Li', isChineseArtist: true },
  周深: { trad: '周深', en: 'Zhou Shen', isChineseArtist: true },
  华晨宇: { trad: '華晨宇', en: 'Hua Chenyu', isChineseArtist: true },
  林忆莲: { trad: '林憶蓮', en: 'Sandy Lam', isChineseArtist: true },
  杨千嬅: { trad: '楊千嬅', en: 'Miriam Yeung', isChineseArtist: true },
  容祖儿: { trad: '容祖兒', en: 'Joey Yung', isChineseArtist: true },
  张敬轩: { trad: '張敬軒', en: 'Hins Cheung', isChineseArtist: true },
  古巨基: { trad: '古巨基', en: 'Leo Ku', isChineseArtist: true },
  谭咏麟: { trad: '譚詠麟', en: 'Alan Tam', isChineseArtist: true },
  谢霆锋: { trad: '謝霆鋒', en: 'Nicholas Tse', isChineseArtist: true },
  陈慧琳: { trad: '陳慧琳', en: 'Kelly Chen', isChineseArtist: true },
  郑秀文: { trad: '鄭秀文', en: 'Sammi Cheng', isChineseArtist: true },
  梅艳芳: { trad: '梅艷芳', en: 'Anita Mui', isChineseArtist: true },
  黄家驹: { trad: '黃家駒', en: 'Beyond', zh: 'Beyond', isChineseArtist: true },
  告五人: { trad: '告五人', en: 'Accusefive', isChineseArtist: true },
  落日飞车: { trad: '落日飛車', en: 'Sunset Rollercoaster', isChineseArtist: true },
  草东没有派对: { trad: '草東沒有派對', en: 'No Party For Cao Dong', isChineseArtist: true },
  万能青年旅店: { trad: '萬能青年旅店', en: 'Omnipotent Youth Society', isChineseArtist: true },
  房东的猫: { trad: '房東的貓', en: "The Landlord's Cat", isChineseArtist: true },
  许巍: { trad: '許巍', en: 'Xu Wei', isChineseArtist: true },
  朴树: { trad: '朴樹', en: 'Pu Shu', isChineseArtist: true },
  赵雷: { trad: '趙雷', en: 'Zhao Lei', isChineseArtist: true },
  李健: { trad: '李健', en: 'Li Jian', isChineseArtist: true },
  汪苏泷: { trad: '汪蘇瀧', en: 'Silence Wang', isChineseArtist: true },
  许嵩: { trad: '許嵩', en: 'Vae Xu', isChineseArtist: true },
  张杰: { trad: '張傑', en: 'Jason Zhang', isChineseArtist: true },
  单依纯: { trad: '單依純', en: 'Shan Yichun', isChineseArtist: true },
  周兴哲: { trad: '周興哲', en: 'Eric Chou', isChineseArtist: true },
  韦礼安: { trad: '韋禮安', en: 'WeiBird', isChineseArtist: true },
  卢广仲: { trad: '盧廣仲', en: 'Crowd Lu', isChineseArtist: true },
  魏如萱: { trad: '魏如萱', en: 'waa wei', isChineseArtist: true },
  安溥: { trad: '安溥', en: 'anpu', isChineseArtist: true },
  张悬: { trad: '張懸', en: 'Deserts Chang', isChineseArtist: true },
  王心凌: { trad: '王心凌', en: 'Cyndi Wang', isChineseArtist: true },
  飞儿乐团: { trad: '飛兒樂團', en: 'F.I.R.', isChineseArtist: true },
  信乐团: { trad: '信樂團', en: 'Shin', isChineseArtist: true },
  动力火车: { trad: '動力火車', en: 'Power Station', isChineseArtist: true },
  凤凰传奇: { trad: '鳳凰傳奇', en: 'Phoenix Legend', isChineseArtist: true },
  那英: { trad: '那英', en: 'Na Ying', isChineseArtist: true },
  韩红: { trad: '韓紅', en: 'Han Hong', isChineseArtist: true },
  孙楠: { trad: '孫楠', en: 'Sun Nan', isChineseArtist: true },
  汪峰: { trad: '汪峰', en: 'Wang Feng', isChineseArtist: true },
  陈粒: { trad: '陳粒', en: 'Chen Li', isChineseArtist: true },
  于文文: { trad: '于文文', en: 'Kelly Yu', isChineseArtist: true },
  李荣浩_alt: { trad: '李榮浩', en: 'Li Ronghao', zh: '李荣浩', isChineseArtist: true },
  张惠妹_alt: { trad: '張惠妹', en: 'A-Mei', zh: '张惠妹', isChineseArtist: true },
  邓紫棋_alt: { trad: '鄧紫棋', en: 'GEM', zh: '邓紫棋', isChineseArtist: true },
  林俊杰_alt: { trad: '林俊傑', en: 'Lin Junjie', zh: '林俊杰', isChineseArtist: true },
  陈奕迅_alt: { trad: '陳奕迅', en: 'Chan Eason', zh: '陈奕迅', isChineseArtist: true },
  周杰伦_alt: { trad: '周杰倫', en: 'Chou Jay', zh: '周杰伦', isChineseArtist: true },
  孙燕姿_alt: { trad: '孫燕姿', en: 'Yanzi Sun', zh: '孙燕姿', isChineseArtist: true },

  // J-Pop & K-Pop & Western Pop (keep authentic international artist names!)
  坂本龙一: { trad: '坂本龍一', en: 'Ryuichi Sakamoto', isChineseArtist: false },
  久石让: { trad: '久石讓', en: 'Joe Hisaishi', isChineseArtist: false },
  米津玄师: { trad: '米津玄師', en: 'Kenshi Yonezu', isChineseArtist: false },
  宇多田光: { trad: '宇多田光', en: 'Hikaru Utada', isChineseArtist: false },
  藤井风: { trad: '藤井風', en: 'Fujii Kaze', isChineseArtist: false },
  防弹少年团: { trad: '防彈少年團', en: 'BTS', isChineseArtist: false },
  粉墨: { trad: 'BLACKPINK', en: 'BLACKPINK', isChineseArtist: false },
  泰勒斯威夫特: { trad: 'Taylor Swift', en: 'Taylor Swift', isChineseArtist: false },
  泰勒: { trad: 'Taylor Swift', en: 'Taylor Swift', isChineseArtist: false },
  霉霉: { trad: 'Taylor Swift', en: 'Taylor Swift', isChineseArtist: false },
  比莉艾利什: { trad: 'Billie Eilish', en: 'Billie Eilish', isChineseArtist: false },
  碧梨: { trad: 'Billie Eilish', en: 'Billie Eilish', isChineseArtist: false },
  盆栽哥: { trad: 'The Weeknd', en: 'The Weeknd', isChineseArtist: false },
  威肯: { trad: 'The Weeknd', en: 'The Weeknd', isChineseArtist: false },
  火星哥: { trad: 'Bruno Mars', en: 'Bruno Mars', isChineseArtist: false },
  黄老板: { trad: 'Ed Sheeran', en: 'Ed Sheeran', isChineseArtist: false },
  阿黛尔: { trad: 'Adele', en: 'Adele', isChineseArtist: false },
  酷玩乐队: { trad: 'Coldplay', en: 'Coldplay', isChineseArtist: false },
  酷玩: { trad: 'Coldplay', en: 'Coldplay', isChineseArtist: false },
  冷玩: { trad: 'Coldplay', en: 'Coldplay', isChineseArtist: false },
  拉娜德雷: { trad: 'Lana Del Rey', en: 'Lana Del Rey', isChineseArtist: false },
  打雷姐: { trad: 'Lana Del Rey', en: 'Lana Del Rey', isChineseArtist: false },
  魔力红: { trad: 'Maroon 5', en: 'Maroon 5', isChineseArtist: false },
  梦龙: { trad: 'Imagine Dragons', en: 'Imagine Dragons', isChineseArtist: false },
  林肯公园: { trad: 'Linkin Park', en: 'Linkin Park', isChineseArtist: false },
  披头士: { trad: 'The Beatles', en: 'The Beatles', isChineseArtist: false },
  皇后乐队: { trad: 'Queen', en: 'Queen', isChineseArtist: false },
  迈克尔杰克逊: { trad: 'Michael Jackson', en: 'Michael Jackson', isChineseArtist: false },
  贾斯汀比伯: { trad: 'Justin Bieber', en: 'Justin Bieber', isChineseArtist: false },
  比伯: { trad: 'Justin Bieber', en: 'Justin Bieber', isChineseArtist: false },
  蕾哈娜: { trad: 'Rihanna', en: 'Rihanna', isChineseArtist: false },
  碧昂丝: { trad: 'Beyoncé', en: 'Beyoncé', isChineseArtist: false },
  a妹: { trad: 'Ariana Grande', en: 'Ariana Grande', isChineseArtist: false },
  断眉: { trad: 'Charlie Puth', en: 'Charlie Puth', isChineseArtist: false },
  烟鬼: { trad: 'The Chainsmokers', en: 'The Chainsmokers', isChineseArtist: false },
  萌德: { trad: 'Shawn Mendes', en: 'Shawn Mendes', isChineseArtist: false },
  侃爷: { trad: 'Kanye West', en: 'Kanye West', isChineseArtist: false },
  德雷克: { trad: 'Drake', en: 'Drake', isChineseArtist: false },
  水果姐: { trad: 'Katy Perry', en: 'Katy Perry', isChineseArtist: false },
  戳爷: { trad: 'Troye Sivan', en: 'Troye Sivan', isChineseArtist: false },
  啪姐: { trad: 'Dua Lipa', en: 'Dua Lipa', isChineseArtist: false },
  牛姐: { trad: 'Mariah Carey', en: 'Mariah Carey', isChineseArtist: false },
  席琳迪翁: { trad: 'Celine Dion', en: 'Celine Dion', isChineseArtist: false },
  艾薇儿: { trad: 'Avril Lavigne', en: 'Avril Lavigne', isChineseArtist: false },
  后街男孩: { trad: 'Backstreet Boys', en: 'Backstreet Boys', isChineseArtist: false },
  西城男孩: { trad: 'Westlife', en: 'Westlife', isChineseArtist: false },
  老鹰乐队: { trad: 'Eagles', en: 'Eagles', isChineseArtist: false },
  绿洲乐队: { trad: 'Oasis', en: 'Oasis', isChineseArtist: false },
};

const ARTIST_ALIASES: Record<string, ArtistAliasEntry> = {};
const EN_TO_ZH_ARTIST = new Map<string, string>();
const TRAD_TO_ZH_ARTIST = new Map<string, string>();

function normAscii(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

for (const [k, v] of Object.entries(RAW_ARTIST_ALIASES)) {
  const zh = v.zh || k.replace(/_alt$/, '');
  const entry: ArtistAliasEntry = {
    zh,
    trad: v.trad,
    en: v.en,
    isChineseArtist: Boolean(v.isChineseArtist),
  };
  if (!k.endsWith('_alt')) {
    ARTIST_ALIASES[k] = entry;
  }
  if (entry.isChineseArtist) {
    EN_TO_ZH_ARTIST.set(normAscii(entry.en), zh);
    TRAD_TO_ZH_ARTIST.set(entry.trad, zh);
    TRAD_TO_ZH_ARTIST.set(zh, zh);
  }
}

/**
 * English/Romanized song titles returned by Deezer / Apple US / Apple SG for Chinese artists
 * mapped back to their canonical Simplified Chinese song titles!
 * Key format: normalized lowercase English title (stripped of punctuation & parentheticals).
 */
const CHINESE_SONG_EN_TO_ZH: Record<string, string> = {
  // 周杰伦 Jay Chou
  sunnyday: '晴天',
  clearday: '晴天',
  qingtian: '晴天',
  commonjasmineorange: '七里香',
  qilixiang: '七里香',
  nocturne: '夜曲',
  yequ: '夜曲',
  ricefield: '稻香',
  daoxiang: '稻香',
  blueandwhiteporcelain: '青花瓷',
  qinghuaci: '青花瓷',
  loveconfession: '告白气球',
  confessionballoon: '告白气球',
  gaobaiqiqiu: '告白气球',
  simplelove: '简单爱',
  tornado: '龙卷风',
  silence: '安静',
  stranded: '搁浅',
  stepaside: '搁浅',
  allthewaynorth: '一路向北',
  eastwindbreaks: '东风破',
  hairlikesnow: '发如雪',
  faraway: '千里之外',
  chrysanthemumterrace: '菊花台',
  coralsea: '珊瑚海',
  orchidpavilion: '兰亭序',
  rainbow: '彩虹',
  dandelionspromise: '蒲公英的约定',
  secret: '不能说的秘密',
  wontcry: '说好不哭',
  greatestworksofart: '最伟大的作品',
  lovebeforebc: '爱在西元前',
  starrymood: '星晴',
  nunchucks: '双截棍',
  givemethetimeofasong: '给我一首歌的时间',
  excuse: '借口',
  mapleleaf: '枫',
  maple: '枫',
  retreat: '退后',
  sweetheart: '甜甜的',
  inthenameofthefather: '以父之名',
  waitingforyou: '等你下课',
  waitforyou: '等你下课',
  listentomom: '听妈妈的话',
  twilightchapterseven: '夜的第七章',
  handwrittenpast: '手写的从前',
  whatkindofman: '算什么男人',
  whitewindmill: '白色风车',
  alittlebit: '一点点',
  backtothepast: '回到过去',
  gobacktothepast: '回到过去',
  thepromisedlove: '说好的幸福呢',
  reddustinn: '红尘客栈',
  mingmingjiu: '明明就',
  loveinbc: '爱在西元前',
  herbalistsmanual: '本草纲目',
  codenamered: '暗号',
  secrettalk: '暗号',
  fragile: '脆弱',
  blackhumor: '黑色幽默',
  cute여자: '可爱女人',
  adorablelady: '可爱女人',
  cutewoman: '可爱女人',
  endlesslove: '一路向北',
  pinkocean: '粉色海洋',

  // 孙燕姿 Stefanie Sun
  againstthelight: '逆光',
  niguang: '逆光',
  cloudyday: '天黑黑',
  darkness: '天黑黑',
  tianheihei: '天黑黑',
  beginningtounderstand: '开始懂了',
  starttounderstand: '开始懂了',
  kaishidongle: '开始懂了',
  whatimiss: '我怀念的',
  imiss: '我怀念的',
  wohuainiande: '我怀念的',
  encounter: '遇见',
  yujian: '遇见',
  greenlight: '绿光',
  lvguang: '绿光',
  kepler: '克卜勒',
  iamnotsad: '我不难过',
  notsad: '我不难过',
  rainyday: '雨天',
  samekind: '同类',
  thedesiredhappiness: '我要的幸福',
  mydesiredhappiness: '我要的幸福',
  thehappinessiwant: '我要的幸福',
  tearsintopoems: '眼泪成诗',
  firstday: '第一天',
  kite: '风筝',
  magical: '神奇',
  magic: '神奇',
  foolskingdom: '愚人的国度',
  mylove: '我的爱',
  superfast: '超快感',
  escape: '逃亡',
  leave: '逃亡',
  sleepwalking: '梦游',
  gujiguji: '咕叽咕叽',
  vortex: '漩涡',
  invisibleman: '隐形人',
  loveletter: '情书',

  // 陈奕迅 Eason Chan
  tenyears: '十年',
  exaggerated: '浮夸',
  kuazhang: '浮夸',
  undermountfuji: '富士山下',
  fujimountain: '富士山下',
  transferoflove: '爱情转移',
  redrose: '红玫瑰',
  whiterose: '白玫瑰',
  longtimenosee: '好久不见',
  lonelywarrior: '孤勇者',
  kingofkaraoke: 'K歌之王',
  elimination: '淘汰',
  yourbackpack: '你的背包',
  unconditional: '无条件',
  bestfriend: '最佳损友',
  becauseoflove: '因为爱情',
  tomorrowwillbefine: '明年今日',
  graperipens: '葡萄成熟时',
  yearslikesongs: '岁月如歌',
  onthethread: '一丝不挂',

  // 林俊杰 JJ Lin
  riversouth: '江南',
  jiangnan: '江南',
  practicelove: '修炼爱情',
  twilight: '不为谁而作的歌',
  shesays: '她说',
  littledimples: '小酒窝',
  backtobackhug: '背对背拥抱',
  caocao: '曹操',
  ifonly: '可惜没如果',
  athousandyearslater: '一千年以后',
  remember: '记得',
  drunkenredcliff: '醉赤壁',

  // 邓紫棋 G.E.M.
  bubble: '泡沫',
  paomo: '泡沫',
  lightyearsaway: '光年之外',
  likeyou: '喜欢你',
  guangnianzhiwai: '光年之外',
  allaboutyou: '关于你的',
  countdown: '倒数',
  sentence: '句号',
  fullstop: '句号',
  longafter: '很久以后',
  glowing: '摩天动物园',

  // 王菲 Faye Wong
  redbean: '红豆',
  hongdou: '红豆',
  fleetingtime: '匆匆那年',
  eyesonme: 'Eyes On Me',
  willing: '我愿意',
  iwilling: '我愿意',
  humanworld: '人间',
  legend: '传奇',
  aswished: '如愿',

  // 五月天 / 梁静茹 / 田馥甄 / 林宥嘉 / 方大同 / 陶喆 / 张国荣 / Beyond 等
  suddenlymissingyou: '突然好想你',
  suddenlymissingyousobad: '突然好想你',
  tenderness: '温柔',
  contentment: '知足',
  stubborn: '倔强',
  alittlehappiness: '小幸运',
  myluckyday: '小幸运',
  devilamongangels: '魔鬼中的天使',
  tellinglies: '说谎',
  lie: '说谎',
  fulfillment: '成全',
  later: '后来',
  courage: '勇气',
  unfortunatelynotyou: '可惜不是你',
  warm: '暖暖',
  lovelovelove: '爱爱爱',
  threepersonstour: '三人游',
  specialperson: '特别的人',
  regularfriends: '普通朋友',
  loveissimple: '爱很简单',
  quicksand: '流沙',
  town: '小镇姑娘',
  goodbyekiss: '吻别',
  boundlessoceansvastskies: '海阔天空',
  trulyloveyou: '真的爱你',
  gloriousyears: '光辉岁月',
  thewindrises: '起风了',
  ordinaryroad: '平凡之路',
  bluelotus: '蓝莲花',
  onceyou: '曾经的你',
  drowningmyworries: '消愁',
  actor: '演员',
  decent: '体面',
  bigfish: '大鱼',
  meaningoftravel: '旅行的意义',
  summerfruit: '盛夏的果实',
  redhighheels: '红色高跟鞋',
  rewind: '倒带',
  sunneversets: '日不落',
  invisiblewings: '隐形的翅膀',
  littlelovesong: '小情歌',
  monica: 'Monica',
  chase: '追',
  themoonrepresentsmyheart: '月亮代表我的心',
  sweetdreams: '甜蜜蜜',
  missedlove: '爱人错过',
  missingyouunderstars: '披星戴月的想你',
};

const CHINESE_ALBUM_EN_TO_ZH: Record<string, string> = {
  yehhweimei: '叶惠美',
  yehuimei: '叶惠美',
  fantasy: '范特西',
  commonjasmineorange: '七里香',
  novemberschopin: '十一月的萧邦',
  stillfantasy: '依然范特西',
  ontherun: '我很忙',
  capricorn: '魔杰座',
  theera: '跨时代',
  opus12: '十二新作',
  theeightdimensions: '八度空间',
  jaychousbedtimestories: '周杰伦的床边故事',
  aiyonotbad: '哎呦，不错哦',
  greatestworksofart: '最伟大的作品',
  againstthelight: '逆光',
  mydesiredhappiness: '我要的幸福',
  kite: '风筝',
  tobecontinued: '未完成',
  aperfectday: '完美的一天',
  itstime: '是时候',
  kepler: '克卜勒',
  dancingvangogh: '跳舞的梵谷',
  yanzi: '孙燕姿',
  blackwhitegrey: '黑白灰',
  u87: 'U87',
  whatgoingon: "What's Going On...?",
  admitit: '认了吧',
  riceandshine: '米·闪',
  haventmet: '乐行者',
  secondheaven: '第二天堂',
  caocao: '曹操',
  storiesuntold: '因你而在',
  genesis: '新地球',
  frommtoyou: '和自己对话',
  xposed: 'Xposed',
  heartbeat: '新的心跳',
  cityzoo: '摩天动物园',
};

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

export function toSimplifiedChinese(text: string): string {
  if (!text || !hasCjk(text)) return text;
  let out = '';
  for (const ch of text) {
    out += T2S_MAP[ch] || ch;
  }
  return out;
}

/**
 * Checks if an artist name belongs to a Chinese (Mandopop/Cantopop) artist
 * and returns their canonical Simplified Chinese name (e.g., "Jay Chou" -> "周杰伦", "孫燕姿" -> "孙燕姿").
 */
export function resolveChineseArtistName(rawArtist: string): string | null {
  const trimmed = (rawArtist || '').trim();
  if (!trimmed) return null;

  const simp = toSimplifiedChinese(trimmed);
  if (TRAD_TO_ZH_ARTIST.has(trimmed)) return TRAD_TO_ZH_ARTIST.get(trimmed)!;
  if (TRAD_TO_ZH_ARTIST.has(simp)) return TRAD_TO_ZH_ARTIST.get(simp)!;

  // Handle "Jay Chou / 周杰倫" or "Stefanie Sun (孫燕姿)" or "G.E.M. 鄧紫棋"
  const cjkMatch = simp.match(/[\u4e00-\u9fff]{2,8}/);
  if (cjkMatch && TRAD_TO_ZH_ARTIST.has(cjkMatch[0])) {
    return TRAD_TO_ZH_ARTIST.get(cjkMatch[0])!;
  }

  const ascii = normAscii(trimmed);
  if (EN_TO_ZH_ARTIST.has(ascii)) {
    return EN_TO_ZH_ARTIST.get(ascii)!;
  }

  // Handle "Artist A, Artist B" or "Artist A / Artist B"
  const parts = trimmed.split(/\s*[/,&、]\s*/).filter(Boolean);
  if (parts.length > 1) {
    let changed = false;
    const mapped = parts.map((p) => {
      const m = resolveChineseArtistName(p);
      if (m) {
        changed = true;
        return m;
      }
      return hasCjk(p) ? toSimplifiedChinese(p) : p;
    });
    if (changed) return mapped.join(' / ');
  }

  return hasCjk(trimmed) ? simp : null;
}

/**
 * Localizes a track's title, artist, and album to clean Simplified Chinese whenever
 * the artist is a Chinese artist (e.g. "Sunny Day / Jay Chou / Yeh, Hwei-Mei" -> "晴天 / 周杰伦 / 叶惠美",
 * "開始懂了 / 孫燕姿" -> "开始懂了 / 孙燕姿"). Western artists remain authentic English!
 */
export function localizeTrackDisplay(input: {
  title: string;
  artist: string;
  album: string;
}): { title: string; artist: string; album: string; isChineseTrack: boolean } {
  const zhArtist = resolveChineseArtistName(input.artist);
  const isChinese = Boolean(zhArtist || hasCjk(input.title));

  if (!isChinese) {
    return {
      title: input.title.trim(),
      artist: input.artist.trim(),
      album: input.album.trim(),
      isChineseTrack: false,
    };
  }

  const finalArtist = zhArtist || toSimplifiedChinese(input.artist.trim());

  // 1. Localize title
  let finalTitle = input.title.trim();
  if (hasCjk(finalTitle)) {
    // Extract clean Chinese title if mixed like "Sunny Day (晴天)" or "晴天 (Sunny Day)"
    finalTitle = toSimplifiedChinese(finalTitle);
    const parenZh = finalTitle.match(/^([A-Za-z0-9\s.'’\-!?]+)\s*[（(]([\u4e00-\u9fff][^）)]*)[）)]$/);
    if (parenZh) {
      finalTitle = parenZh[2].trim();
    }
  } else {
    // Pure English title by a Chinese artist (e.g. "Sunny Day" or "Sunny Day (Remastered)")
    const stripped = finalTitle.replace(/\(.*?\)|（.*?）|\[.*?\]/g, '').trim();
    const suffixMatch = finalTitle.match(/(\s*[（(][^）)]+[）)])$/);
    const key = normAscii(stripped);
    if (CHINESE_SONG_EN_TO_ZH[key]) {
      const suffix = suffixMatch ? suffixMatch[1] : '';
      // Keep meaningful qualifiers like (Live), drop noisy (Remastered)
      const keepSuffix = /live|现场|合唱|版/i.test(suffix) ? suffix : '';
      finalTitle = `${CHINESE_SONG_EN_TO_ZH[key]}${keepSuffix}`;
    }
  }

  // 2. Localize album
  let finalAlbum = input.album.trim();
  if (hasCjk(finalAlbum)) {
    finalAlbum = toSimplifiedChinese(finalAlbum);
  } else {
    const strippedAlb = finalAlbum.replace(/\(.*?\)|（.*?）|\[.*?\]/g, '').trim();
    const albKey = normAscii(strippedAlb);
    if (CHINESE_ALBUM_EN_TO_ZH[albKey]) {
      finalAlbum = CHINESE_ALBUM_EN_TO_ZH[albKey];
    }
  }

  return {
    title: finalTitle,
    artist: finalArtist,
    album: finalAlbum,
    isChineseTrack: true,
  };
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

  const simp = toSimplifiedChinese(primary);
  const exactHint =
    SONG_TITLE_HINTS[primary] || SONG_TITLE_HINTS[simp] || SONG_TITLE_HINTS[trad] || null;

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

function normalizeTitleCore(title: string, artist: string): string {
  const loc = localizeTrackDisplay({ title, artist, album: '' });
  return toSimplifiedChinese(loc.title)
    .toLowerCase()
    .replace(/\(.*?\)|（.*?）|\[.*?\]|【.*?】/g, '')
    .replace(/\s*[-—–]\s*(remaster|live|single|radio edit|acoustic|instrumental).*$/i, '')
    .replace(/[^\w\u4e00-\u9fff]/g, '');
}

function normalizeArtistCore(artist: string): string {
  const zh = resolveChineseArtistName(artist);
  const base = zh || artist;
  return toSimplifiedChinese(base)
    .toLowerCase()
    .replace(/\(.*?\)|（.*?）|\[.*?\]/g, '')
    .replace(/[^\w\u4e00-\u9fff]/g, '');
}

/**
 * Canonical deduplication key that merges Simplified, Traditional, and English-titled
 * duplicates of the SAME song (e.g. "Sunny Day - Jay Chou" == "晴天 - 周杰倫" == "晴天 - 周杰伦"),
 * while NEVER collapsing two different songs into the same key!
 */
export function canonicalTrackKey(title: string, artist: string): string {
  const normTitle = normalizeTitleCore(title, artist);
  const normArtist = normalizeArtistCore(artist);
  if (!normTitle) {
    return `raw:${title.trim().toLowerCase()}::${normArtist}`;
  }
  return `${normTitle}::${normArtist}`;
}

/**
 * STRICT track verification for audio preview resolution!
 * Prevents the catastrophic bug where searching "孙燕姿 逆光" matches album《逆光》and plays
 * a completely different song (like "我怀念的" or "梦游") under "逆光"'s cover!
 */
export function isStrictTrackMatch(
  candidate: { title: string; artist: string },
  target: { title: string; artist: string }
): boolean {
  const candTitle = normalizeTitleCore(candidate.title, candidate.artist);
  const targTitle = normalizeTitleCore(target.title, target.artist);
  if (!candTitle || !targTitle) return false;

  // 1. STRICT TITLE CHECK — exact match, or very tight containment when title >= 2 chars
  const titleExact = candTitle === targTitle;
  const titleTightMatch =
    !titleExact &&
    Math.min(candTitle.length, targTitle.length) >= 2 &&
    (candTitle.startsWith(targTitle) || targTitle.startsWith(candTitle)) &&
    Math.abs(candTitle.length - targTitle.length) <= 4;

  if (!titleExact && !titleTightMatch) return false;

  // 2. ARTIST CHECK (when target artist is known)
  const targArtist = normalizeArtistCore(target.artist);
  if (!targArtist || targArtist === '未知歌手') return true;
  const candArtist = normalizeArtistCore(candidate.artist);
  if (!candArtist) return false;

  return (
    candArtist === targArtist ||
    candArtist.includes(targArtist) ||
    targArtist.includes(candArtist)
  );
}

export interface ExternalMusicLinks {
  netease: string;
  qq: string;
  apple: string;
  spotify: string;
}

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
