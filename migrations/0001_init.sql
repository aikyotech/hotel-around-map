CREATE TABLE IF NOT EXISTS hotel (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS spots (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  tags TEXT NOT NULL,
  image_urls TEXT NOT NULL,
  event_start_at TEXT,
  event_end_at TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  google_maps_url TEXT
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pv_count INTEGER NOT NULL,
  last_updated TEXT NOT NULL
);

INSERT INTO hotel (id, name, latitude, longitude) VALUES (1, 'ラ・ロンコントル', 33.833395132000696, 132.76678651517162);

INSERT INTO stats (id, pv_count, last_updated) VALUES (1, 159, '2026-06-24T15:03:40.742Z');

INSERT INTO spots (id, type, source, name, description, latitude, longitude, tags, image_urls, event_start_at, event_end_at, status, created_at, google_maps_url) VALUES (
  'spot-dogo-onsen',
  'sightseeing',
  'hotel_master',
  '{"ja":"道後温泉本館","en":"Dogo Onsen Honkan","zh_cn":"道后温泉本馆","zh_tw":"道後溫泉本館","ko":"도고 온센 혼칸 (도고 온천 본관)"}',
  '{"ja":"3000年以上の歴史を誇る日本最古の温泉であり、国の重要文化財に指定された壮麗な3階建ての城郭風木造建築です。小説『坊っちゃん』や映画のモデルとして名高く、平成の大改修を終えて古き佳き時代の贅沢な佇まいが蘇りました。とろりとした美肌の湯を心ゆくまでご堪能ください。","en":"The jewel of Ehime boasting a magnificent castle-like wooden complex with over 3,000 years of bathhouse history. Declared a National Important Cultural Property, its legendary alkaline waters soothe structural tension and leave the skin silky smooth.","zh_cn":"拥有3000年历史的日本古老名汤，整座建筑是一栋被公认为国家重要文化财产的壮丽日本城堡风三层木质楼阁。这里也是宫崎骏电影及众多文学名著的灵感圣地，滑爽的碱性泉质具有极佳的美肌功效。","zh_tw":"擁有3000年歷史的日本古老名湯，整座建築是一棟被公認為國家重要文化財產的壯麗日本城堡風三層木質樓閣。這裡也是宮崎駿電影及眾多文學名著的靈感聖地，華爽的鹼性泉質具有極佳的美肌功效。","ko":"3000년 이상의 역사를 품은 일본에서 가장 오래된 온천이자, 국가 중요문화재로指定된 장엄한 3층 규모의 전통 목조건축물입니다. 소설과 영화의 배경 모델로도 유명하며, 최근 대대적인 복원 공사를 마치고 한층 우아한 자태로 미끄러운 미인탕의 온천수를 제공합니다."}',
  33.85295280953467,
  132.78641804625482,
  '["#スタッフ厳選","#和モダン","#名湯温泉"]',
  '["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop"]',
  NULL,
  NULL,
  'active',
  '2026-06-24T13:43:14.184Z',
  'https://maps.app.goo.gl/riSUrPQ8vWpZ8Lg58'
);

