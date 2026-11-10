// Site content cloned from https://www.aph-ita.co.th (WordPress + WooCommerce)
// Images/PDFs point at the live WordPress uploads. Run `npm run import:wp -- --download-images`
// to mirror them into /public/images instead of hot-linking.

const WP = 'https://www.aph-ita.co.th/wp-content/uploads'

export const site = {
  name: 'APH Interactive',
  legalName: 'บริษัท เอพีเอช อินเตอร์แอคทีฟ จำกัด',
  englishName: 'APH Interactive Co.,Ltd.',
  tagline: 'จำหน่ายสินค้า Electronic',
  description:
    'APH Interactive ผู้นำเข้าและจัดจำหน่ายหัวต่อสัญญาณ Amphenol XLR, Ethernet, Loudspeaker, Power, Multipin, Mini XLR สำหรับงานเสียงมืออาชีพ',
  taxId: '0105563180254',
  addressTh: '520 ซอยพระรามที่ 2 ซอย 60 แขวงแสมดำ เขตบางขุนเทียน กทม. 10150',
  addressEn: '520 Rama 2 Alley 60, Samae Dam, Bangkhunthian, Bangkok 10150',
  phones: ['081-551-1120', '081-935-8283'],
  email: 'info@api-ita.co.th',
  line: { label: '@aphinteractive', url: 'https://lin.ee/uMAKFJh' },
  facebook: 'https://www.facebook.com/aphinteractive',
  instagram: 'https://www.instagram.com/aphinteractive',
  hours: 'จันทร์ – เสาร์ 08:30 – 17:30 น.',
  sourceSite: 'https://www.aph-ita.co.th'
}

export const heroSlides = [
  {
    title: 'Amphenol Dante',
    kicker: 'AMPHE-DANTE ADAPTERS',
    subtitle: 'Professional 1-Channel & 2-Channel Dante Audio Solutions',
    image: `${WP}/2026/08/Amphenol_Date-scaled.jpeg`,
    link: '/product-category/dante',
    linkLabel: 'ดูข้อมูลเพิ่มเติม',
    theme: 'dark'
  },
  {
    title: 'XLRnet',
    kicker: 'ETHERNET CONNECTORS',
    subtitle: 'เทียบสัญญานเหนือชั้นกว่าแบรนด์อื่น ตัวเล็กแต่ได้สัญญานคม ไม่พลาดทุกการเชื่อมต่อ',
    image: `${WP}/2026/05/ethernet_promotion.png`,
    link: '/product-category/ethernet/xlrnet',
    linkLabel: 'ดูข้อมูลเพิ่มเติม',
    theme: 'light'
  },
  {
    title: 'Amphenol Loudspeaker',
    kicker: 'SP / EP / AP SERIES',
    subtitle: 'หัวต่อลำโพงระดับมืออาชีพ 2 และ 4 ขั้ว มาตรฐานอุตสาหกรรม',
    image: `${WP}/2026/05/LoadSpeaker_promotion.png`,
    link: '/product-category/loudspeaker',
    linkLabel: 'ดูรายละเอียดเพิ่มเติม',
    theme: 'light'
  },
  {
    title: 'XLR Connectors',
    kicker: 'AC / AX / IP65 SERIES',
    subtitle: 'หัวต่อสัญญาณเสียงคุณภาพสูง งานทนทาน กันน้ำ IP65 พร้อมให้เลือกครบ',
    image: `${WP}/2026/05/date_promotion-scaled.png`,
    link: '/product-category/xlr',
    linkLabel: 'ดูข้อมูลเพิ่มเติม',
    theme: 'light'
  }
]

export const serviceBlocks = [
  { title: 'สั่งซื้อออนไลน์', subtitle: 'สะดวก รวดเร็วทันใจ ไม่กี่ขั้นตอน', image: `${WP}/2026/08/bg_block.png`, link: '/products', linkLabel: 'เลือกซื้อสินค้า' },
  { title: 'แหล่งความรู้', subtitle: 'ค้นหาบทความที่คุณชื่นชม', image: `${WP}/2026/08/bg_block.png`, link: '/articles', linkLabel: 'อ่านบทความ' },
  { title: 'ตัวแทนจำหน่าย', subtitle: 'ร้านตัวแทนจำหน่ายทั่วประเทศ', image: `${WP}/2026/08/bg_block.png`, link: '/dealers', linkLabel: 'ค้นหาร้านค้า' }
]

export const catalogs = [
  { title: 'Amphenol XLR', series: 'XLR / AC / AX', image: `${WP}/2026/08/1_XLR_chassis_Mounts-1.png`, file: `${WP}/2026/03/Amphenol_XLR_3.pdf` },
  { title: 'Amphenol Loudspeaker', series: 'SP / EP / AP', image: `${WP}/2026/08/Loadspeaker.png`, file: `${WP}/2026/03/Amphenol_Loader_speaker.pdf` },
  { title: 'Amphenol Power', series: 'HP / HPT', image: `${WP}/2026/08/Power.png`, file: `${WP}/2026/03/Amphenol_Power_Cable-Connector_Mounts.pdf` },
  { title: 'Amphenol Ethernet', series: 'XLRnet / RJ45', image: `${WP}/2026/08/Ethernet.png`, file: `${WP}/2026/03/Amphenol_Ethernet_Cable_Connectors.pdf` },
  { title: '1/4" & 3.5 mm', series: 'K / M / T / Q', image: `${WP}/2026/08/1-4_3.5mm.png`, file: `${WP}/2026/03/Amphenol_Phone_1-4And3.5mm_accessories.pdf` },
  { title: 'Amphenol RCA', series: 'ACPR / ACPL / ACJR', image: `${WP}/2026/08/6_rca.jpg`, file: `${WP}/2026/03/Amphenol_RCA.pdf` },
  { title: 'Mini XLR', series: 'AG Series', image: `${WP}/2026/08/7.mini_xlr.jpg`, file: `${WP}/2026/03/Amphenol_Mini_XLR_1.pdf` },
  { title: 'Multipin', series: 'MP-41 / MP-62', image: `${WP}/2026/08/8Multipin.jpg`, file: `${WP}/2026/03/Amphenol_multipin.pdf` },
  { title: 'USB / HDMI Data', series: 'Data Connectors', image: `${WP}/2026/08/11_Data_Connectors_USB-HDMI-1.png`, file: `${WP}/2026/03/Amphenol_USB.pdf` },
  { title: 'Amphenol Dante', series: 'Amphe-Dante', image: `${WP}/2026/08/10Data-Connector_amphe.jpg`, file: `${WP}/2026/03/Amphenol_Dante.pdf` }
]

export const posts = [
  {
    id: 11781, slug: 'amphenol-เสร็จสิ้นการเข้าซื้อกิจการ-ccs-จาก-commscope', kind: 'news',
    title: 'Amphenol เสร็จสิ้นการเข้าซื้อกิจการ CCS จาก CommScope',
    excerpt: 'Amphenol Corporation ประกาศเสร็จสิ้นการเข้าซื้อกิจการ Connectivity and Cable Solutions (CCS) จาก CommScope เสริมความแข็งแกร่งในกลุ่มงานโครงข่ายและดาต้าเซ็นเตอร์',
    image: `${WP}/2026/07/news-768x432.webp`, category: 'News', published_at: '2026-07-28 04:01:44'
  },
  {
    id: 1979, slug: 'rca-connectors-m-series', kind: 'article',
    title: 'RCA CONNECTORS – M SERIES: มาตรฐานการเชื่อมต่อเสียงสำหรับระบบ Audio/Video',
    excerpt: 'หัวต่อ RCA ซีรีส์ M จาก Amphenol ออกแบบสำหรับงานติดตั้งทั้งในสตูดิโอและงานอีเวนต์ เลือกวัสดุตัวเรือนที่ทนทาน พร้อมการป้องกันสัญญาณรบกวนได้อย่างมีประสิทธิภาพ',
    image: `${WP}/2022/12/how-to-choose-a-hi-fi-stereo-system-entry-header-opt.jpg`, category: 'RCA', published_at: '2022-12-13 14:55:19'
  },
  {
    id: 2023, slug: '3-5-mm-เชื่อมต่อจากมือถือ-ด้วย-k-series', kind: 'article',
    title: '3.5 mm เชื่อมต่อจากมือถือ ด้วย K Series',
    excerpt: 'การเชื่อมต่อสัญญาณเสียงจากมือถือหรือแท็บเล็ตเข้ากับมิกเซอร์ทำได้ง่ายขึ้นด้วยหัวต่อ K Series ช่วยให้สัญญาณเสียงต้นทางเสถียร และมีความเพี้ยนต่ำ',
    image: `${WP}/2022/12/best-gaming-laptop-model-entry-header-opt.jpg`, category: '1/4" & 3.5 mm', published_at: '2022-12-13 15:15:11'
  },
  {
    id: 1814, slug: '1-4-phone-jack', kind: 'article',
    title: '1/4″ Phone Jack',
    excerpt: 'ทำความรู้จักหัวต่อ Phone Jack ขนาด 1/4 นิ้ว ที่ใช้ในระบบเครื่องเสียงมืออาชีพ ตั้งแต่ปลั๊ก TRS ไปจนถึง TS สำหรับงานดนตรี',
    image: `${WP}/2026/01/1-4-parent_cover.jpg`, category: '1/4" & 3.5 mm', published_at: '2022-12-13 12:27:12'
  },
  {
    id: 1780, slug: 'loudspeaker-connectors-sp-series', kind: 'article',
    title: 'LOUDSPEAKER CONNECTORS – SP SERIES: โซลูชั่นมาตรฐานสำหรับระบบเสียงมืออาชีพ',
    excerpt: 'ซีรีส์ SP เป็นหัวต่อลำโพง (Loudspeaker connector) ให้เลือกทั้งแบบ 2 หรือ 4 ขั้ว ตัวเรือน Thermoplastic ทนทาน พร้อมขั้วสัมผัสกระแสสูง',
    image: `${WP}/2022/12/cameras-for-street-photography-entry-header-opt.jpg`, category: 'Loudspeaker', published_at: '2022-12-13 12:11:30'
  },
  {
    id: 1717, slug: 'xlr-cable-connectors-ax-series', kind: 'article',
    title: 'XLR CABLE CONNECTORS – AX SERIES: มาตรฐานใหม่ของการเชื่อมต่อสัญญาณเสียงคุณภาพสูง',
    excerpt: 'ซีรีส์ AX ยกระดับความทนทานและการยึดเกาะของหัวต่อ XLR ให้แน่นหนาขึ้น ลดการหลุดระหว่างใช้งาน พร้อมคุณภาพการส่งสัญญาณระดับสตูดิโอ',
    image: `${WP}/2022/12/3-minimalist-desk-setups-entry-header-opt.jpg`, category: 'XLR', published_at: '2022-12-12 15:58:17'
  },
  {
    id: 2024, slug: 'delivery-and-return-policy', kind: 'news',
    title: 'การจัดส่งและการคืนสินค้า',
    excerpt: 'จัดส่งฟรีทั่วประเทศเมื่อสั่งซื้อครบตามเงื่อนไข โดยขนส่งชั้นนำ ตรวจสอบสินค้าได้ก่อนรับ และมีนโยบายคืนสินค้าภายใน 7 วัน',
    image: `${WP}/2026/08/Delivery.png`, category: 'บริการ', published_at: '2022-12-10 09:00:00'
  }
]

export const dealers = [
  { name: 'APH Interactive (สำนักงานใหญ่)', province: 'กรุงเทพมหานคร', region: 'กรุงเทพฯ และปริมณฑล', phone: '081-551-1120', address: '520 ซอยพระรามที่ 2 ซอย 60 แขวงแสมดำ เขตบางขุนเทียน กทม. 10150' },
  { name: 'ศูนย์บริการและคลังสินค้า', province: 'สมุทรสาคร', region: 'กรุงเทพฯ และปริมณฑล', phone: '081-935-8283', address: 'ถนนเศรษฐกิจ 1 อ.กระทุ่มแบน จ.สมุทรสาคร' },
  { name: 'ตัวแทนจำหน่ายภาคกลาง', province: 'นครปฐม', region: 'ภาคกลาง', phone: '081-935-8283', address: 'อ.เมือง จ.นครปฐม' },
  { name: 'ตัวแทนจำหน่ายภาคเหนือ', province: 'เชียงใหม่', region: 'ภาคเหนือ', phone: '081-551-1120', address: 'อ.เมือง จ.เชียงใหม่' },
  { name: 'ตัวแทนจำหน่ายภาคตะวันออกเฉียงเหนือ', province: 'ขอนแก่น', region: 'ภาคอีสาน', phone: '081-551-1120', address: 'อ.เมือง จ.ขอนแก่น' },
  { name: 'ตัวแทนจำหน่ายภาคตะวันออก', province: 'ชลบุรี', region: 'ภาคตะวันออก', phone: '081-935-8283', address: 'อ.ศรีราชา จ.ชลบุรี' },
  { name: 'ตัวแทนจำหน่ายภาคใต้', province: 'สงขลา', region: 'ภาคใต้', phone: '081-551-1120', address: 'อ.หาดใหญ่ จ.สงขลา' },
  { name: 'ตัวแทนจำหน่ายภาคตะวันออก (ภูเก็ต)', province: 'ภูเก็ต', region: 'ภาคใต้', phone: '081-935-8283', address: 'อ.เมือง จ.ภูเก็ต' }
]

// ---- Category copy (Thai) used for category pages and product fronts ----
export const categoryCopy = {
  xlr: {
    summary: 'หัวต่อ XLR ของ Amphenol สำหรับงานเสียงมืออาชีพ ทั้งแบบตัวผู้ (Male) และตัวเมีย (Female) พร้อมให้เลือกหลายซีรีส์ ตั้งแต่ AC Series สำหรับงานติดตั้ง ไปจนถึง AX Series สำหรับงานสายสัญญาณ และรุ่น IP65 สำหรับงานกลางแจ้ง',
    bullets: ['ขั้วสัมผัสคุณภาพสูงทองแดงชุบเงิน', 'มีทั้งงานบัดกรี (Solder) และงาน PCB', 'ตัวเรือนโลหะทนทาน พร้อมตัวล็อกแบบกด', 'มีรุ่นกันน้ำ IP65 สำหรับงานกลางแจ้ง']
  },
  ethernet: {
    summary: 'XLRnet คือหัวต่ออีเทอร์เน็ต RJ45 รูปแบบ XLR ของ Amphenol ตัวเล็กแต่ได้สัญญานคม เชื่อมต่อได้มั่นคงกว่าหัวต่อ RJ45 ทั่วไป เหมาะกับงานเสียง–ภาพแบบเครือข่าย และงานเวทีที่ต้องการความเชื่อถือได้',
    bullets: ['หัวต่อ RJ45 ในรูปแบบ XLR ล็อกแน่น', 'รองรับ CAT5E / CAT6', 'มีรุ่น IP65 กันน้ำ', 'ตัวเครื่องโลหะกันสัญญาณรบกวน']
  },
  loudspeaker: {
    summary: 'ซีรีส์ SP / EP / AP เป็นหัวต่อลำโพง (Loudspeaker connector) มีให้เลือกแบบ 2 หรือ 4 ขั้ว ตัวเรือน Thermoplastic ทนทาน พร้อมขั้วสัมผัสกระแสสูง ส่งสัญญาณได้ไม่ผิดเพี้ยน เข้ากับมาตฐานหัวต่อลำโพงอุตสาหกรรม',
    bullets: ['ขั้วสัมผัสกระแสสูง ทองแดงชุบเงิน', 'ตัวเรือน Thermoplastic ทนทาน', 'ระบบล็อกแบบ Quick release ป้องกันการสั่นสะเทือน', 'มีให้เลือก 2 และ 4 ขั้ว']
  },
  multipin: {
    summary: 'หัวต่อ Multipin MP Series สำหรับงานที่ต้องเดินสายสัญญาณหลายชุดในเส้นเดียว ช่วยลดเวลาติดตั้งและลดความผิดพลาดในการต่อสาย เหมาะกับงานเวที งานอีเวนต์ และงานติดตั้งถาวร',
    bullets: ['รวมสายหลายชุดในหัวเดียว', 'ตัวล็อกแบบเกลียวแน่นหนา', 'อะไหล่และไกด์ให้เลือกครบ', 'เหมาะกับงานเวทีและงานติดตั้ง']
  },
  rca: {
    summary: 'หัวต่อ RCA ของ Amphenol ซีรีส์ AC ผลิตจากโลหะคุณภาพสูง มีทั้งแบบบัดกรีและแบบขันเกลียว พร้อมให้เลือกหลายสีตามมาตรฐานสัญญาณ (แดง/ขาว/เหลือง) และแบบตัวผู้–ตัวเมีย',
    bullets: ['ตัวเรือนโลหะชุบนิกเกิล', 'มีให้เลือกทั้งแบบบัดกรีและขันเกลียว', 'หลากสีตามมาตรฐานสัญญาณ', 'มีทั้งตัวผู้และตัวเมีย']
  },
  'mini-xlr': {
    summary: 'หัวต่อ Mini XLR ซีรีส์ AG ขนาดกะทัดรัดสำหรับอุปกรณ์ที่พื้นที่จำกัด เช่น กล้อง อินเทอร์เฟซ และหูฟังระดับสตูดิโอ ให้ความมั่นคงเทียบเท่า XLR ขนาดมาตรฐาน',
    bullets: ['ขนาดเล็ก เหมาะกับงานพื้นที่จำกัด', 'มีแบบ 3–6 ขั้ว', 'ตัวล็อกแบบกดแน่นหนา', 'งานประกอบคุณภาพสูง']
  },
  power: {
    summary: 'หัวต่อไฟ AC ซีรีส์ HP และ HPT สำหรับงานเครื่องเสียงมืออาชีพ รับกระแสได้สูง พร้อมระบบล็อกที่ป้องกันการหลุดระหว่างใช้งาน เหมาะกับงานเวทีและงานติดตั้ง',
    bullets: ['รับกระแสไฟได้สูง', 'ระบบล็อกแบบ Twist-lock', 'ตัวเรือนทนความร้อน', 'มีทั้งแบบตัวผู้ ตัวเมีย และฝาครอบ']
  },
  dante: {
    summary: 'Amphe-Dante Adapters หัวแปลงสัญญาณ Dante เป็นอนาล็อก แบบรับเข้า/ส่งออก 1 และ 2 ช่องสัญญาณ ลดจำนวนสายสัญญาณในงานติดตั้ง และเชื่อมต่อระบบเสียงผ่านเครือข่ายได้ทันที',
    bullets: ['แปลง Dante เป็นอนาล็อก และอนาล็อกเป็น Dante', 'มีให้เลือก 1 และ 2 ช่องสัญญาณ', 'เชื่อมต่อผ่าน PoE เพียงเส้นเดียว', 'เหมาะกับงานติดตั้งระบบเสียงเครือข่าย']
  },
  '1-4-3-5mm': {
    summary: 'หัวต่อ Phone Jack ขนาด 1/4 นิ้ว และ 3.5 มม. ซีรีส์ K / M / T / Q สำหรับงานดนตรีและงานสตูดิโอ ให้เสียงที่ชัดเจน พร้อมการยึดเกาะที่แน่นหนา',
    bullets: ['มีทั้งแบบ TS และ TRS', 'ตัวเรือนโลหะชุบนิกเกิล', 'ตัวล็อกกันหลุดขณะใช้งาน', 'มีให้เลือกทั้ง 1/4" และ 3.5 mm']
  },
  data: {
    summary: 'หัวต่อข้อมูล USB / HDMI และคอนเนกเตอร์สำหรับงานดาต้า ของ Amphenol รองรับงานส่งข้อมูลความเร็วสูง พร้อมตัวเรือนโลหะกันสัญญาณรบกวน',
    bullets: ['รองรับ USB 2.0 / 3.0 และ HDMI', 'ตัวเรือนโลหะกันสัญญาณรบกวน', 'งานประกอบมาตรฐานอุตสาหกรรม']
  },
  'aph-auido-cable': {
    summary: 'สายสัญญาณสำเร็จรูปจาก APH Interactive พร้อมใช้งานทันที ทั้ง XLR, 1/4" TS, RCA, Speakon และ Ethernet คัดสรรวัสดุคุณภาพเพื่อความทนทานในงานใช้งานจริง',
    bullets: ['พร้อมใช้งาน ไม่ต้องบัดกรี', 'มีหลายความยาวให้เลือก', 'วัสดุสายคุณภาพ เสียงเพี้ยนต่ำ']
  }
}
