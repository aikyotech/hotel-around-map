/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageCode = 'ja' | 'en' | 'zh_cn' | 'zh_tw' | 'ko';

export type SpotType = 'restaurant' | 'event' | 'sightseeing';

export type SpotSource = 'hotel_master' | 'external_api';

export interface MultiLangString {
  ja: string;
  en: string;
  zh_cn: string;
  zh_tw: string;
  ko: string;
}

export interface Spot {
  id: string;
  type: SpotType;
  source: SpotSource;
  name: MultiLangString;
  description: MultiLangString;
  latitude: number;
  longitude: number;
  tags: string[]; // e.g., ['#スタッフ厳選', '#ご当地グルメ']
  image_urls: string[];
  // For events
  event_start_at?: string; // ISO string or YYYY-MM-DD
  event_end_at?: string;   // ISO string or YYYY-MM-DD
  status: 'active' | 'inactive';
  created_at: string;
  
  // Computed properties (calculated at runtime)
  distanceMeters?: number;
  walkMinutes?: number;

  // Google Maps URL to open in external maps
  google_maps_url?: string;
}

export interface SystemStats {
  pvCount: number;
  activeSpotCount: number;
  activeEventCount: number;
  lastUpdated: string;
}

export const TAG_OPTIONS = [
  '#すべて',
  '#スタッフ厳選',
  '#ご当地グルメ',
  '#ランチ',
  '#ディナー',
  '#居酒屋',
  '#本日開催イベント',
  '#子連れ歓迎',
  '#徒歩5分以内'
];

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  ja: '日本語',
  en: 'English',
  zh_cn: '简体中文',
  zh_tw: '繁體中文',
  ko: '한국어'
};

export const UI_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  ja: {
    appTitle: 'ホテル周辺デジタルコンシェルジュ',
    backToMap: '地図へ戻る',
    categoryAll: 'すべて',
    categoryRestaurant: 'グルメ',
    categoryEvent: 'イベント',
    categorySightseeing: '観光スポット',
    distanceWalk: '徒歩 {min} 分 / 約 {dist}m',
    routeGuidance: 'Google マップでルート案内',
    routeGuidanceApple: 'iOS マップでルート案内',
    statusOpen: '営業中',
    statusClosed: '休業中 / 期間外',
    statusTodayEvent: '本日開催！',
    filterTitle: 'タグで絞り込む',
    cmsButton: '管理者画面',
    cmsTitle: 'ホテル周辺 CMSポータル',
    gpsTrackingActive: 'GPS連動中',
    gpsTrackingInactive: '現在地を表示',
    gpsSimulateWalking: '疑似移動シミュレーション',
    noSpotsFound: '該当するスポットが見つかりません。別のタグをお試しください。',
    spotLabelHotelSelected: 'ホテル厳選',
    spotLabelGeneral: '周辺スポット',
    aboutApp: 'QRコード読取だけでログイン不要、旅をもっと快適に。',
    guestView: 'ゲスト用画面へ戻る'
  },
  en: {
    appTitle: 'Hotel Neighborhood Digital Concierge',
    backToMap: 'Back to Map',
    categoryAll: 'All',
    categoryRestaurant: 'Gourmet',
    categoryEvent: 'Events',
    categorySightseeing: 'Sightseeing',
    distanceWalk: 'Walk {min} min / approx. {dist}m',
    routeGuidance: 'Route in Google Maps',
    routeGuidanceApple: 'Route in Apple Maps',
    statusOpen: 'Open',
    statusClosed: 'Closed / Out of term',
    statusTodayEvent: 'Happening Today!',
    filterTitle: 'Filter by tags',
    cmsButton: 'Staff Portal',
    cmsTitle: 'Concierge CMS Portal',
    gpsTrackingActive: 'GPS Tracking Active',
    gpsTrackingInactive: 'Show Current Location',
    gpsSimulateWalking: 'Simulate Walking Tracker',
    noSpotsFound: 'No matched spots. Try other tag filters.',
    spotLabelHotelSelected: 'Staff Pick',
    spotLabelGeneral: 'Local Area',
    aboutApp: 'Scan the room QR and find local eats instantly without login.',
    guestView: 'Return to Guest Mode'
  },
  zh_cn: {
    appTitle: '酒店周边数字向导',
    backToMap: '返回地图',
    categoryAll: '全部',
    categoryRestaurant: '美食',
    categoryEvent: '活动',
    categorySightseeing: '观光景点',
    distanceWalk: '步行 {min} 分钟 / 约 {dist}米',
    routeGuidance: 'Google 地图路线导航',
    routeGuidanceApple: 'Apple 地图路线导航',
    statusOpen: '营业中',
    statusClosed: '休息中 / 活动结束',
    statusTodayEvent: '今日举办！',
    filterTitle: '按标签过滤',
    cmsButton: '管理后台',
    cmsTitle: '酒店周边CMS管理系统',
    gpsTrackingActive: 'GPS 定位开启',
    gpsTrackingInactive: '显示当前位置',
    gpsSimulateWalking: '模拟步行移动',
    noSpotsFound: '没有找到符合条件的景点。请尝试其他标签。',
    spotLabelHotelSelected: '酒店精选',
    spotLabelGeneral: '周边景点',
    aboutApp: '无需登录注册，扫码即刻获取酒店周边美食玩乐推荐。',
    guestView: '返回游客模式'
  },
  zh_tw: {
    appTitle: '酒店周邊數位向導',
    backToMap: '返回地圖',
    categoryAll: '全部',
    categoryRestaurant: '美食',
    categoryEvent: '活動',
    categorySightseeing: '觀光景點',
    distanceWalk: '步行 {min} 分鐘 / 約 {dist}米',
    routeGuidance: 'Google 地圖路線導航',
    routeGuidanceApple: 'Apple 地圖路線導航',
    statusOpen: '營業中',
    statusClosed: '休息中 / 活動結束',
    statusTodayEvent: '今日舉辦！',
    filterTitle: '依標籤過濾',
    cmsButton: '管理後台',
    cmsTitle: '酒店周邊CMS管理系統',
    gpsTrackingActive: 'GPS 定位開啟',
    gpsTrackingInactive: '顯示目前位置',
    gpsSimulateWalking: '模擬步行移動',
    noSpotsFound: '沒有找到符合條件的景點。請嘗試其他標籤。',
    spotLabelHotelSelected: '酒店精選',
    spotLabelGeneral: '周邊景點',
    aboutApp: '無需登入註冊，掃碼即刻獲取酒店周邊美食玩樂推薦。',
    guestView: '返回遊客模式'
  },
  ko: {
    appTitle: '호텔 주변 디지털 컨시에르지',
    backToMap: '지도로 돌아가기',
    categoryAll: '전체',
    categoryRestaurant: '맛집',
    categoryEvent: '이벤트',
    categorySightseeing: '관광지',
    distanceWalk: '도보 {min} 분 / 약 {dist}m',
    routeGuidance: 'Google 지도로 길찾기',
    routeGuidanceApple: 'Apple 지도로 길찾기',
    statusOpen: '영업 중',
    statusClosed: '휴무 중 / 기간 외',
    statusTodayEvent: '오늘 개최!',
    filterTitle: '태그 필터',
    cmsButton: '관리자 화면',
    cmsTitle: '컨시에르지 CMS 포털',
    gpsTrackingActive: 'GPS 연동 중',
    gpsTrackingInactive: '현재 위치 보기',
    gpsSimulateWalking: '가상 이동 시뮬레이션',
    noSpotsFound: '해당하는 장소를 찾을 수 없습니다. 다른 태그를 눌러보세요.',
    spotLabelHotelSelected: '호텔 추천',
    spotLabelGeneral: '주변 스폿',
    aboutApp: '로그인 없이 객실 QR코드 리딩만으로 주변 명소와 맛집을 한눈에.',
    guestView: '게스트 화면으로 돌아가기'
  }
};
