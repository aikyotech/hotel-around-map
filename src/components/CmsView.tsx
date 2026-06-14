/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import L from 'leaflet';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Sparkles, 
  Download, 
  Eye, 
  Activity, 
  MapPin, 
  Save, 
  Check, 
  Search,
  BookOpen,
  Image as ImageIcon,
  Clock,
  Briefcase,
  AlertCircle,
  Lock,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Spot, SystemStats, TAG_OPTIONS, LANGUAGE_LABELS, LanguageCode } from '../types';

interface CmsViewProps {
  onBackToGuest: () => void;
}

const EXPERT_PRESETS = [
  { name: 'Sushi 🍣', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop' },
  { name: 'Ramen noodle 🍜', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop' },
  { name: 'Matcha Tea Cafe 🍵', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop' },
  { name: 'Yasaka Shrine ⛩️', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop' },
  { name: 'Gion Alley Lanterns 🏮', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop' },
  { name: 'Temple Bamboo 🎋', url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop' },
];

export default function CmsView({ onBackToGuest }: CmsViewProps) {
  // Login Gate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Hotel core settings
  const [hotelConfig, setHotelConfig] = useState({
    name: '京都祇園グランドホテル',
    latitude: 35.0037,
    longitude: 135.7782,
  });

  // DB datasets
  const [spots, setSpots] = useState<Spot[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    pvCount: 0,
    activeSpotCount: 0,
    activeEventCount: 0,
    lastUpdated: '-'
  });

  // Form states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentSpot, setCurrentSpot] = useState<Partial<Spot> | null>(null);
  
  // AI Translation visual states
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationSuccess, setTranslationSuccess] = useState<boolean>(false);

  // New AI Auto-Refresh/Quick Assist features
  const [isRefreshingAround, setIsRefreshingAround] = useState<boolean>(false);

  // Around Recommended spots auto-refresh via search grounding
  const handleAutoRefreshAround = async () => {
    if (!confirm('現在地ホテル（愛媛松山）の周辺スポットをGoogle Search / Maps の実在データから自動収集し、周辺案内データベースを最新に更新します。既存のスポットは最新のおすすめ情報に置き換えられます。よろしいですか？\n(Gemini 3.5-flash & Google Grounding 搭載)')) return;
    
    setIsRefreshingAround(true);
    try {
      const res = await fetch('/api/spots/auto-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`松山周辺の最新の人気スポット・名店情報 ${data.count} 件の自動取得と多言語データベース更新に成功しました！`);
        fetchCmsData();
      } else {
        const err = await res.json();
        alert(`自動更新に失敗しました: ${err.error || '不明なエラー'}`);
      }
    } catch (e) {
      alert('自動更新中にネットワークエラーが発生しました。');
    } finally {
      setIsRefreshingAround(false);
    }
  };

  // QR Code canvas reference
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Interactive Maps State & Reference Refs
  const hotelMapRef = useRef<HTMLDivElement>(null);
  const hotelMapInstanceRef = useRef<L.Map | null>(null);
  const hotelMarkerInstanceRef = useRef<L.Marker | null>(null);

  const spotMapRef = useRef<HTMLDivElement>(null);
  const spotMapInstanceRef = useRef<L.Map | null>(null);
  const spotMarkerInstanceRef = useRef<L.Marker | null>(null);

  // Set up and sync Hotel Map
  useEffect(() => {
    if (!isAuthenticated || isEditing) {
      if (hotelMapInstanceRef.current) {
        hotelMapInstanceRef.current.remove();
        hotelMapInstanceRef.current = null;
        hotelMarkerInstanceRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!hotelMapRef.current) return;

      if (!hotelMapInstanceRef.current) {
        const map = L.map(hotelMapRef.current, {
          zoomControl: false,
          center: [hotelConfig.latitude, hotelConfig.longitude],
          zoom: 15
        });
        hotelMapInstanceRef.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        const marker = L.marker([hotelConfig.latitude, hotelConfig.longitude], {
          draggable: true
        }).addTo(map);
        hotelMarkerInstanceRef.current = marker;

        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          setHotelConfig(prev => ({
            ...prev,
            latitude: Number(pos.lat.toFixed(6)),
            longitude: Number(pos.lng.toFixed(6))
          }));
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setHotelConfig(prev => ({
            ...prev,
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6))
          }));
        });
      } else {
        const map = hotelMapInstanceRef.current;
        const marker = hotelMarkerInstanceRef.current;
        if (marker) {
          const currentLatLng = marker.getLatLng();
          if (Math.abs(currentLatLng.lat - hotelConfig.latitude) > 0.00001 || Math.abs(currentLatLng.lng - hotelConfig.longitude) > 0.00001) {
            marker.setLatLng([hotelConfig.latitude, hotelConfig.longitude]);
            map.panTo([hotelConfig.latitude, hotelConfig.longitude]);
          }
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isEditing, hotelConfig.latitude, hotelConfig.longitude]);

  // Set up and sync Spot Map
  useEffect(() => {
    if (!isAuthenticated || !isEditing || !currentSpot) {
      if (spotMapInstanceRef.current) {
        spotMapInstanceRef.current.remove();
        spotMapInstanceRef.current = null;
        spotMarkerInstanceRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!spotMapRef.current) return;

      const currentLat = currentSpot.latitude || hotelConfig.latitude;
      const currentLng = currentSpot.longitude || hotelConfig.longitude;

      if (!spotMapInstanceRef.current) {
        const map = L.map(spotMapRef.current, {
          zoomControl: false,
          center: [currentLat, currentLng],
          zoom: 15
        });
        spotMapInstanceRef.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        const marker = L.marker([currentLat, currentLng], {
          draggable: true
        }).addTo(map);
        spotMarkerInstanceRef.current = marker;

        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          setCurrentSpot(prev => {
            if (!prev) return null;
            return {
              ...prev,
              latitude: Number(pos.lat.toFixed(6)),
              longitude: Number(pos.lng.toFixed(6))
            };
          });
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setCurrentSpot(prev => {
            if (!prev) return null;
            return {
              ...prev,
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6))
            };
          });
        });
      } else {
        const map = spotMapInstanceRef.current;
        const marker = spotMarkerInstanceRef.current;
        if (marker) {
          const currentLatLng = marker.getLatLng();
          if (Math.abs(currentLatLng.lat - currentLat) > 0.00001 || Math.abs(currentLatLng.lng - currentLng) > 0.00001) {
            marker.setLatLng([currentLat, currentLng]);
            map.panTo([currentLat, currentLng]);
          }
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isEditing, currentSpot?.latitude, currentSpot?.longitude]);

  const fetchCmsData = async () => {
    try {
      // 1. Fetch hotel configs
      const hRes = await fetch('/api/hotel');
      if (hRes.ok) {
        const hData = await hRes.json();
        setHotelConfig(hData);
      }

      // 2. Fetch spots
      const sRes = await fetch('/api/spots');
      if (sRes.ok) {
        const sData = await sRes.json();
        setSpots(sData);
      }

      // 3. Fetch statistics
      const stRes = await fetch('/api/stats');
      if (stRes.ok) {
        const stData = await stRes.json();
        setStats(stData);
      }
    } catch (e) {
      console.error('Failed to load CMS data:', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCmsData();
    }
  }, [isAuthenticated]);

  // Handle QR Canvas and Image generation
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Fallback URL to absolute hosting origin or specific URL
    const targetUrl = window.location.origin;
    setQrUrl(targetUrl);

    if (qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        targetUrl,
        {
          width: 140,
          margin: 1.5,
          color: {
            dark: '#0f172a', // deep slate
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR creation error details:', error);
        }
      );
    }

    QRCode.toDataURL(
      targetUrl,
      {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      },
      (error, url) => {
        if (error) {
          console.error('QR toDataURL error:', error);
          return;
        }
        setQrDataUrl(url);
      }
    );
  }, [isAuthenticated, stats]);

  // QR Downloader action
  const handleDownloadQr = () => {
    const downloadUrl = qrDataUrl || (qrCanvasRef.current ? qrCanvasRef.current.toDataURL('image/png') : '');
    if (!downloadUrl) {
      alert('QRコードが生成されていません。');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.download = 'hotel_concierge_qr.png';
      link.href = downloadUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      alert('ブラウザのセキュリティ制限により、直接ダウンロードができない場合があります。画像（QRコード）を右クリックまたは長押しして「画像を保存」してください。');
    }
  };

  // Submit Password
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'admin') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('パスワードが正しくありません (ヒント: admin と入力してください)');
    }
  };

  // Update Hotel Location config
  const handleUpdateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hotelConfig)
      });
      if (res.ok) {
        alert('ホテルの基本設定を変更しました。すべてに徒歩距離・徒歩分数が即時に再計算されます。');
        fetchCmsData();
      }
    } catch (e) {
      alert('更新に失敗しました。');
    }
  };

  // Trigger Gemini translation with natural translation API
  const handleTriggerAiTranslation = async () => {
    const textToTranslate = currentSpot?.description?.ja;
    if (!textToTranslate || textToTranslate.trim() === '') {
      alert('自動翻訳を行うには、まず「日本語の紹介文」を入力してください。');
      return;
    }

    setIsTranslating(true);
    setTranslationSuccess(false);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate })
      });

      if (res.ok) {
        const translations = await res.json();
        setCurrentSpot(prev => {
          if (!prev) return null;
          return {
            ...prev,
            description: {
              ja: prev.description?.ja || '',
              en: translations.en || '',
              zh_cn: translations.zh_cn || '',
              zh_tw: translations.zh_tw || '',
              ko: translations.ko || '',
            },
            name: {
              ja: prev.name?.ja || '',
              en: prev.name?.en || prev.name?.ja || '',
              zh_cn: prev.name?.zh_cn || prev.name?.ja || '',
              zh_tw: prev.name?.zh_tw || prev.name?.ja || '',
              ko: prev.name?.ko || prev.name?.ja || '',
            }
          };
        });
        setTranslationSuccess(true);
      } else {
        alert('翻訳サーバーのエラーが発生しました。');
      }
    } catch (e) {
      console.error(e);
      alert('AI翻訳処理に失敗しました。');
    } finally {
      setIsTranslating(false);
    }
  };

  // Create or Update spot handler
  const handleSaveSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSpot?.name?.ja || !currentSpot?.latitude || !currentSpot?.longitude) {
      alert('スポット名（日本語）、緯度、経度は必須項目です。');
      return;
    }

    const isNew = !currentSpot.id;
    const url = isNew ? '/api/spots' : `/api/spots/${currentSpot.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSpot)
      });

      if (res.ok) {
        setIsEditing(false);
        setCurrentSpot(null);
        setTranslationSuccess(false);
        fetchCmsData();
      } else {
        alert('保存に失敗しました。入力値を確認してください。');
      }
    } catch (e) {
      alert('通信に失敗しました。');
    }
  };

  // Delete spot handler
  const handleDeleteSpot = async (id: string) => {
    if (!confirm('このスポット情報を削除してもよろしいですか？')) return;
    try {
      const res = await fetch(`/api/spots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCmsData();
      } else {
        alert('削除に失敗しました。');
      }
    } catch (e) {
      alert('通信に失敗しました。');
    }
  };

  // Quick preset coord selector
  const fillPresetCoordinates = (lat: number, lng: number) => {
    setCurrentSpot(prev => {
      if (!prev) return null;
      return {
        ...prev,
        latitude: lat,
        longitude: lng
      };
    });
  };

  // Filter list by searchQuery
  const filteredSpots = spots.filter(spot => {
    const q = searchQuery.toLowerCase();
    const jaName = spot.name.ja.toLowerCase();
    const enName = (spot.name.en || '').toLowerCase();
    const valMatched = jaName.includes(q) || enName.includes(q);
    const tagMatched = spot.tags.some(tag => tag.toLowerCase().includes(q));
    const typeMatched = spot.type.toLowerCase().includes(q);
    return valMatched || tagMatched || typeMatched;
  });

  // Setup blank initial spot for Creating form
  const handleInitNewSpot = () => {
    const blankSpot: Partial<Spot> = {
      type: 'restaurant',
      source: 'hotel_master',
      name: { ja: '', en: '', zh_cn: '', zh_tw: '', ko: '' },
      description: { ja: '', en: '', zh_cn: '', zh_tw: '', ko: '' },
      latitude: hotelConfig.latitude + 0.0005, // slightly off-center by default
      longitude: hotelConfig.longitude + 0.0005,
      tags: [],
      image_urls: [''],
      status: 'active',
    };
    setCurrentSpot(blankSpot);
    setIsEditing(true);
    setTranslationSuccess(false);
  };

  const handleInitEditSpot = (spot: Spot) => {
    setCurrentSpot({ ...spot });
    setIsEditing(true);
    setTranslationSuccess(false);
  };

  // Guard view with a Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 select-text relative overflow-hidden">
        {/* Decorative Grid Accent */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
        
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-8 border border-slate-100 animate-scale-up relative z-10">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-indigo-900 rounded-xl flex items-center justify-center text-white mb-4 shadow">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">ホテルスタッフ認証</h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">Management CMS Portal</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">管理者パスワード PIN</label>
              <input 
                type="password"
                placeholder="パスワードを入力してください" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs font-mono"
                required
              />
            </div>

            {loginError && (
              <div className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button 
              id="cms-login-submit"
              type="submit"
              className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition duration-150 text-xs cursor-pointer tracking-wider uppercase"
            >
              ログイン
            </button>
          </form>

          <button 
            onClick={onBackToGuest}
            className="w-full mt-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-[10px] tracking-wider uppercase transition duration-150 flex items-center justify-center border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> ゲスト画面へ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-text relative">
      
      {/* HEADER SECTION */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-[500] shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBackToGuest}
            className="w-8 h-8 border border-slate-200 hover:bg-slate-100 rounded flex items-center justify-center text-slate-600 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-900 rounded-sm flex items-center justify-center text-white font-serif italic font-bold text-sm shrink-0">G</div>
            <div className="flex flex-col">
              <h1 className="text-xs font-extrabold text-slate-800 tracking-tight uppercase leading-none">
                ホテル周辺 CMS 管理ポータル
              </h1>
              <p className="text-[8px] text-slate-400 font-mono tracking-wider font-bold mt-0.5">
                Kyoto Gion Concierge System Office
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={onBackToGuest}
          className="text-[10px] px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold uppercase transition flex items-center cursor-pointer border border-slate-200"
        >
          ゲスト画面 (デモ)
        </button>
      </header>

      {/* BODY COLUMN CONTAINER */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFTSIDE COLUMN (DASHBOARD STATS & BASIC CONFIGS) */}
        {!isEditing && (
          <div className="lg:col-span-1 space-y-6">
            
            {/* 1. STATISTICS DASHBOARD CARD */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider mb-4 flex items-center">
                <Activity className="w-4 h-4 text-emerald-500 mr-1.5" />
                現在の稼働状況 (リアルタイム統計)
              </h2>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-semibold text-slate-400">総 PV 数</span>
                  <div className="text-xl font-bold text-slate-900 mt-1 font-mono tracking-tight">{stats.pvCount}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-semibold text-slate-400">スポット数</span>
                  <div className="text-xl font-bold text-slate-900 mt-1 font-mono tracking-tight">{stats.activeSpotCount}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <span className="text-[10px] font-semibold text-slate-400">イベント数</span>
                  <div className="text-xl font-bold text-rose-600 mt-1 font-mono tracking-tight">{stats.activeEventCount}</div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 border-t border-slate-150 pt-3 flex justify-between">
                <span>最終更新日時:</span>
                <span className="font-mono font-medium">{stats.lastUpdated !== '-' ? new Date(stats.lastUpdated).toLocaleString() : '-'}</span>
              </div>

              {/* AUTOMATED MAP GROUNDING REFRESH TRIGGER */}
              <div className="mt-4 pt-3 border-t border-slate-150">
                <button
                  id="btn-auto-refresh-around"
                  type="button"
                  onClick={handleAutoRefreshAround}
                  disabled={isRefreshingAround}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition duration-150 flex items-center justify-center cursor-pointer disabled:from-slate-150 disabled:to-slate-200 disabled:text-slate-400"
                >
                  {isRefreshingAround ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                      近隣スポット自動取得中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-yellow-250 animate-pulse" />
                      AIが周辺おすすめを自動更新
                    </>
                  )}
                </button>
                <p className="text-[9px] text-slate-400 mt-2 text-left leading-relaxed">
                  ホテルの緯度・経度を中心として、Googleマップ上の実在する人気レストランやおすすめ観光地6選をAI（Gemini 3.5 Flash）が自動探索・多言語で一括更新します。ホテル設定を松山や他の場所へ変えた際もポチッと押すだけで一瞬で最適化されます。
                </p>
              </div>
            </div>

            {/* 2. CORE QR SYSTEM CARD */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <h2 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider mb-2 self-start flex items-center">
                <Download className="w-4 h-4 text-blue-500 mr-1.5" />
                客室掲示用 QRコード生成
              </h2>
              <p className="text-[11px] text-slate-400 self-start text-left mb-4">
                このQRコードを客室のポップアップやフロントに設置することで、お客様はログイン不要で即座に周辺観光情報を開くことができます。
              </p>

              {/* QR Preview (Uses native img element to enable right-click / long-press download in sandboxed contexts) */}
              <div className="bg-white border-2 border-slate-100 p-2 rounded-2xl shadow-sm mb-4 flex items-center justify-center relative">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="Hotel Concierge QR" 
                    className="w-32 h-32 select-all rounded-lg"
                    id="qr-code-img"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-slate-350 text-xs font-medium bg-slate-50 rounded-lg">QR作成中...</div>
                )}
                <canvas ref={qrCanvasRef} className="hidden" />
              </div>

              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-150 mb-3 max-w-full truncate">
                {qrUrl}
              </span>

              <button
                id="btn-cms-qr-download"
                onClick={handleDownloadQr}
                className="w-full bg-slate-900 hover:bg-slate-805 text-white text-xs font-bold rounded-xl py-2.5 px-3 flex items-center justify-center shadow cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> QR コード画像をダウンロード
              </button>
              <p className="text-[9px] text-slate-400 mt-2 text-center leading-relaxed max-w-[240px]">
                ※ セキュリティ制限等でボタンから保存できない場合は、QRコード画像を<strong>右クリックまたは長押しして「画像を保存」</strong>してください。
              </p>
            </div>

            {/* 3. HOTEL SETTINGS CARD (COORDINATES RESIZING) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider mb-4 flex items-center">
                <MapPin className="w-4 h-4 text-amber-500 mr-1.5" />
                ホテルの基本位置情報 (起点座標設定)
              </h2>

              <form onSubmit={handleUpdateHotel} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">ホテル（起点）名称</label>
                  <input 
                    type="text"
                    value={hotelConfig.name}
                    onChange={(e) => setHotelConfig({ ...hotelConfig, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">経緯緯度 (Latitude)</label>
                    <input 
                      type="number"
                      step="any"
                      value={hotelConfig.latitude}
                      onChange={(e) => setHotelConfig({ ...hotelConfig, latitude: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">経度 (Longitude)</label>
                    <input 
                      type="number"
                      step="any"
                      value={hotelConfig.longitude}
                      onChange={(e) => setHotelConfig({ ...hotelConfig, longitude: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Hotel Location Interactive Map */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-semibold text-slate-500">地図上で位置調整（ピンをドラッグ、または地図をクリック）</span>
                  <div 
                    ref={hotelMapRef}
                    id="hotel-settings-map" 
                    className="w-full h-44 rounded-xl border border-slate-200 shadow-inner overflow-hidden relative z-10"
                  ></div>
                </div>

                <button 
                  id="btn-cms-hotel-save"
                  type="submit"
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-150 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 mr-1 text-slate-550" /> 基本設定を保存
                </button>
              </form>
            </div>

          </div>
        )}

        {/* CMS WORK AREA (RIGHTSIDE CRUD LIST OR THE FORM VIEW) */}
        <div className={isEditing ? 'lg:col-span-3' : 'lg:col-span-2'}>
          
          {/* THE MASTER CRUD FORM (EDIT OR NEW) */}
          {isEditing && currentSpot ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow p-6 animate-scale-up">
              
              {/* Form header details */}
              <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center">
                    <Sparkles className="w-5 h-5 text-amber-500 mr-2.5 animate-pulse" />
                    {currentSpot.id ? 'スポット情報の編集' : '新規おすすめスポット情報の一括登録'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">フロントに掲示するスポットやイベントの詳細を入力してください。</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setCurrentSpot(null);
                  }}
                  className="text-xs px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition"
                >
                  キャンセル
                </button>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSaveSpot} className="space-y-6">

                {/* 1. ROW-GROUP: TYPE & SOURCE & STATUS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">種類 (CategoryType)</label>
                    <select
                      value={currentSpot.type}
                      onChange={(e) => setCurrentSpot({ ...currentSpot, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="restaurant">飲食店・グルメ</option>
                      <option value="sightseeing">観光スポット</option>
                      <option value="event">季節限定イベント</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">データソース (Source)</label>
                    <select
                      value={currentSpot.source}
                      onChange={(e) => setCurrentSpot({ ...currentSpot, source: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="hotel_master">ホテル厳選（星ピン表示・★）</option>
                      <option value="external_api">外部API取得（通常ピン表示）</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">現在の公開ステータス</label>
                    <select
                      value={currentSpot.status}
                      onChange={(e) => setCurrentSpot({ ...currentSpot, status: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="active">即時公開 (Active)</option>
                      <option value="inactive">非公開 (Inactive)</option>
                    </select>
                  </div>
                </div>

                {/* 2. ROW-GROUP: NAME CARD */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center mb-1">
                    <BookOpen className="w-4 h-4 text-slate-600 mr-1.5" />
                    スポット名称
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">名称 <span className="text-rose-500">*必須</span></label>
                    <input
                      type="text"
                      placeholder="例: 道後麦酒館、大街道、一福"
                      value={currentSpot.name?.ja || ''}
                      onChange={(e) => setCurrentSpot({
                        ...currentSpot,
                        name: { ...currentSpot.name as any, ja: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* 3. DESCRIPTION CARD */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center">
                      <Sparkles className="w-4 h-4 text-amber-500 mr-1.5" />
                      紹介説明文
                    </h3>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex justify-between">
                      <span>紹介説明文 <span className="text-slate-400">(フロント画面に分かりやすく表示される紹介文です)</span></span>
                      <span className="text-rose-500">*必須</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="例: 松山道後のおすすめのスポットの魅力をご紹介します..."
                      value={currentSpot.description?.ja || ''}
                      onChange={(e) => setCurrentSpot({
                        ...currentSpot,
                        description: { ...currentSpot.description as any, ja: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* 4. ROW-GROUP: COORDINATE LAT & LNG (WITH PRESETS) */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center mb-1">
                    <MapPin className="w-4 h-4 text-slate-600 mr-1.5" />
                    スポット位置座標 (緯度＆経度)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">緯度 (Latitude) <span className="text-rose-500">*必須</span></label>
                      <input
                        type="number"
                        step="any"
                        placeholder="例: 33.8521"
                        value={currentSpot.latitude || ''}
                        onChange={(e) => setCurrentSpot({ ...currentSpot, latitude: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">経度 (Longitude) <span className="text-rose-500">*必須</span></label>
                      <input
                        type="number"
                        step="any"
                        placeholder="例: 132.7865"
                        value={currentSpot.longitude || ''}
                        onChange={(e) => setCurrentSpot({ ...currentSpot, longitude: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Googleマップ URL (任意)</label>
                    <input
                      type="url"
                      placeholder="例: https://maps.app.goo.gl/... または https://www.google.com/maps/place/..."
                      value={currentSpot.google_maps_url || ''}
                      onChange={(e) => setCurrentSpot({ ...currentSpot, google_maps_url: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      ※ 登録すると、ゲスト画面のスポット一覧やポップアップに「Googleマップで開く」ボタンが表示され、ユーザーが直接店舗の位置をGoogleマップアプリで開けるようになります。
                    </p>
                  </div>

                  {/* Spot Location Interactive Map */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-500">地図上で位置調整（ピンをドラッグ、または地図をクリック）</span>
                    <div 
                      ref={spotMapRef}
                      id="spot-editor-map" 
                      className="w-full h-60 rounded-xl border border-slate-200 shadow-inner overflow-hidden relative z-10"
                    ></div>
                  </div>

                  {/* Preset quick buttons */}
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 font-mono">事前登録座標プリセット (1クリック入力)</span>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="block text-[9px] font-semibold text-slate-400 mb-1">【松山・道後周辺 (愛媛県松山市)】</span>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            type="button" 
                            onClick={() => fillPresetCoordinates(33.85214, 132.78648)}
                            className="px-2.5 py-1 text-[10px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer text-slate-600 transition"
                          >
                            ♨️ 道後温泉本館周辺 (33.8521, 132.7865)
                          </button>
                          <button 
                            type="button" 
                            onClick={() => fillPresetCoordinates(33.84562, 132.76541)}
                            className="px-2.5 py-1 text-[10px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer text-slate-600 transition"
                          >
                            🏯 松山城天守閣周辺 (33.8456, 132.7654)
                          </button>
                          <button 
                            type="button" 
                            onClick={() => fillPresetCoordinates(33.84920, 132.78780)}
                            className="px-2.5 py-1 text-[10px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer text-slate-600 transition"
                          >
                            🌳 道後公園周辺 (33.8492, 132.7878)
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[9px] font-semibold text-slate-400 mb-1">【京都祇園周辺】</span>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            type="button" 
                            onClick={() => fillPresetCoordinates(35.0041, 135.7768)}
                            className="px-2.5 py-1 text-[10px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer text-slate-600 transition"
                          >
                            📍 祇園きむら近郊 (35.0041, 135.7768)
                          </button>
                          <button 
                            type="button" 
                            onClick={() => fillPresetCoordinates(35.0025, 135.7791)}
                            className="px-2.5 py-1 text-[10px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer text-slate-600 transition"
                          >
                            📍 祇園たき近郊 (35.0025, 135.7791)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. IMAGE URL LIST (WITH KYOTO RICH PRESETS) */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center mb-1">
                    <ImageIcon className="w-4 h-4 text-slate-600 mr-1.5" />
                    スポット外観・フード写真 URL
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">写真画像 URL</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={(currentSpot.image_urls && currentSpot.image_urls[0]) || ''}
                      onChange={(e) => setCurrentSpot({
                        ...currentSpot,
                        image_urls: [e.target.value]
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  {/* Clicking preset images */}
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 mb-2">【ワンクリック画像入力】京都グルメ・観光スポットお勧め写真素材</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {EXPERT_PRESETS.map((p) => {
                        const isSelected = currentSpot.image_urls?.[0] === p.url;
                        return (
                          <div 
                            key={p.name}
                            onClick={() => setCurrentSpot({ ...currentSpot, image_urls: [p.url] })}
                            className={`cursor-pointer group flex flex-col rounded-lg overflow-hidden border transition bg-white ${
                              isSelected ? 'border-amber-500 ring-2 ring-amber-400/20' : 'border-slate-200 hover:border-slate-350'
                            }`}
                          >
                            <img src={p.url} className="h-10 w-full object-cover grayscale-1/2 group-hover:grayscale-0 duration-150" alt={p.name} referrerPolicy="no-referrer" />
                            <span className="text-[8px] font-bold text-slate-600 text-center py-1 truncate">{p.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 6. TAGS CHOOSING CHECKBOXES */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center">
                    <Briefcase className="w-4 h-4 text-slate-600 mr-1.5" />
                    適用フィルタリングタグ
                  </h3>

                  <div className="flex flex-wrap gap-2.5">
                    {TAG_OPTIONS.filter(tag => tag !== '#すべて' && tag !== '#スタッフ厳選' && tag !== '#徒歩5分以内' && tag !== '#本日開催イベント').map(tag => {
                      const tagsArray = currentSpot.tags || [];
                      const isChecked = tagsArray.includes(tag);
                      
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => {
                            let nextTags = [...tagsArray];
                            if (isChecked) {
                              nextTags = nextTags.filter(t => t !== tag);
                            } else {
                              nextTags.push(tag);
                            }
                            setCurrentSpot({ ...currentSpot, tags: nextTags });
                          }}
                          className={`px-3 py-1 text-xs rounded-lg border font-semibold flex items-center transition cursor-pointer ${
                            isChecked 
                              ? 'bg-slate-900 text-white border-slate-900' 
                              : 'bg-white text-slate-650 border-slate-250 hover:bg-slate-50'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 mr-1" />}
                          {tag.replace('#', '')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 7. EVENT TIMEFRAME DATES (ONLY IF TYPE === EVENT) */}
                {currentSpot.type === 'event' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-rose-50/50 border border-rose-100 rounded-2xl p-5">
                    <div>
                      <label className="block text-xs font-bold text-rose-900 mb-1">イベント開始日 (Start Date)</label>
                      <input
                        type="date"
                        value={currentSpot.event_start_at || ''}
                        onChange={(e) => setCurrentSpot({ ...currentSpot, event_start_at: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-rose-200 bg-white text-sm text-ros-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-rose-900 mb-1">イベント終了・撤去日 (End Date)</label>
                      <input
                        type="date"
                        value={currentSpot.event_end_at || ''}
                        onChange={(e) => setCurrentSpot({ ...currentSpot, event_end_at: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-rose-200 bg-white text-sm text-ros-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Form Action buttons */}
                <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentSpot(null);
                    }}
                    className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition text-xs font-bold font-sans cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    id="btn-cms-spot-submit"
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white border border-slate-250 hover:border-slate-900 text-slate-850 font-bold transition text-xs font-sans flex items-center cursor-pointer"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    スポット情報を保存・一括公開する
                  </button>
                </div>

              </form>

            </div>
          ) : (
            /* THE LIST OF ACTIVE REGISTERED SPOTS */
            <div className="bg-white rounded-3xl border border-slate-200 shadow p-6">
              
              {/* List Header control row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-905">
                    登録済みホテル周辺スポット・観光イベント一覧
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    合計 {filteredSpots.length} 件が登録されています。条件にマッチする項目の一覧が表示されています。
                  </p>
                </div>
                <button
                  id="btn-cms-init-new"
                  onClick={handleInitNewSpot}
                  className="flex bg-slate-900 hover:bg-slate-805 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow transition duration-150 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5 mr-1" /> 新しいスポットを追加
                </button>
              </div>

              {/* Filtering input bar */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 mb-5">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="店名、説明文、ジャンルやカテゴリタグで検索絞り込み..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none focus:ring-0 w-full text-xs text-slate-800"
                />
              </div>

              {/* Table listings */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4">外観</th>
                      <th className="py-3 px-4">種類</th>
                      <th className="py-3 px-4">表示種別</th>
                      <th className="py-3 px-4">スポット名（日英）</th>
                      <th className="py-3 px-4">経緯度座標</th>
                      <th className="py-3 px-4">現在ステータス</th>
                      <th className="py-3 px-4 text-right">管理操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredSpots.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                          検索条件に該当するスポットが見つかりません。
                        </td>
                      </tr>
                    ) : (
                      filteredSpots.map(spot => {
                        const isEvent = spot.type === 'event';
                        const isStaff = spot.source === 'hotel_master';
                        const isActive = spot.status === 'active';
                        
                        return (
                          <tr key={spot.id} className="hover:bg-slate-50/50 duration-100">
                            {/* Spot small card photo icon */}
                            <td className="py-3.5 px-4">
                              <img 
                                src={(spot.image_urls && spot.image_urls[0]) || 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=100'} 
                                alt={spot.name.ja} 
                                className="w-10 h-8 rounded object-cover border border-slate-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            </td>
                            {/* Type classification */}
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                spot.type === 'restaurant' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : isEvent 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                    : 'bg-purple-50 text-purple-700 border border-purple-100'
                              }`}>
                                {spot.type === 'restaurant' ? '和食・グルメ' : isEvent ? '特別イベント' : '観光スポット'}
                              </span>
                            </td>
                            {/* Star Pin badge indication */}
                            <td className="py-3.5 px-4">
                              {isStaff ? (
                                <span className="bg-amber-50 text-amber-800 border border-amber-200/50 rounded-full px-2.5 py-0.5 text-[9px] font-bold inline-flex items-center">
                                  ★ ホテル厳選
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5 text-[9px] font-bold">
                                  一般スポット
                                </span>
                              )}
                            </td>
                            {/* Name translations */}
                            <td className="py-3.5 px-4 font-sans">
                              <p className="font-bold text-slate-850">{spot.name.ja}</p>
                              {spot.name.en && <p className="text-[10px] text-slate-400 mt-0.5">{spot.name.en}</p>}
                            </td>
                            {/* Coords lookup */}
                            <td className="py-3.5 px-4 font-mono text-[9px] text-slate-400">
                              <div>{spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}</div>
                              {spot.google_maps_url && (
                                <a 
                                  href={spot.google_maps_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-indigo-600 hover:underline inline-flex items-center mt-1 font-sans text-[10px]"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 mr-0.5" /> Mapsで確認
                                </a>
                              )}
                            </td>
                            {/* Status logic */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                isActive 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-slate-100/80 text-slate-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isActive ? 'bg-emerald-500' : 'bg-slate-350'}`}></span>
                                {isActive ? '公開中' : '非公開'}
                              </span>
                            </td>
                            {/* Actions CRUD buttons */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex space-x-2">
                                <button
                                  id={`edit-spot-${spot.id}`}
                                  onClick={() => handleInitEditSpot(spot)}
                                  className="p-1 px-2 text-[10px] font-bold text-slate-650 hover:text-slate-900 bg-slate-50 border border-slate-200 hover:border-slate-350 duration-100 rounded flex items-center"
                                  title="情報編集"
                                >
                                  <Edit className="w-3 h-3 mr-0.5" /> 編集
                                </button>
                                <button
                                  id={`delete-spot-${spot.id}`}
                                  onClick={() => handleDeleteSpot(spot.id)}
                                  className="p-1 px-2 text-[10px] font-bold text-rose-600 hover:text-rose-900 bg-rose-50 border border-rose-100 hover:border-rose-250 duration-105 rounded flex items-center"
                                  title="スポットを削除"
                                >
                                  <Trash2 className="w-3 h-3 mr-0.5" /> 削除
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

      </main>

    </div>
  );
}
