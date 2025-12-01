// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import styles from './App.module.css';
import { supabase } from './lib/supabaseClient';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('Гость');
  const [userId, setUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destinationCities, setDestinationCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTelegram, setIsTelegram] = useState<boolean>(false);

  // 🔧 Улучшенная функция для получения Telegram WebApp
  const getTelegramWebApp = () => {
    if (typeof window === 'undefined') return null;
    
    // Пробуем разные способы доступа к Telegram WebApp
    const telegram = (window as any).Telegram?.WebApp || 
                    (window as any).tg?.WebApp ||
                    (window as any).TelegramWebApp;
    
    return telegram || null;
  };

  // 🔧 Улучшенная функция для получения данных пользователя
  const getTelegramUser = async (): Promise<{id: string, firstName: string} | null> => {
    const webApp = getTelegramWebApp();
    
    if (!webApp) {
      console.log('[DEBUG] Telegram WebApp not found');
      return null;
    }

    console.log('[DEBUG] Telegram WebApp found:', {
      version: webApp.version,
      platform: webApp.platform,
      initData: webApp.initData,
      initDataUnsafe: webApp.initDataUnsafe
    });

    // Ждем инициализации WebApp
    if (!webApp.initData && !webApp.initDataUnsafe) {
      console.log('[DEBUG] Waiting for Telegram WebApp initialization...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Способ 1: Через initDataUnsafe (предпочтительный)
    if (webApp.initDataUnsafe?.user) {
      const user = webApp.initDataUnsafe.user;
      console.log('[DEBUG] User from initDataUnsafe:', user);
      return {
        id: user.id.toString(),
        firstName: user.first_name || user.username || 'Друг'
      };
    }

    // Способ 2: Через initData строку
    if (webApp.initData) {
      try {
        const params = new URLSearchParams(webApp.initData);
        const userStr = params.get('user');
        
        if (userStr) {
          const user = JSON.parse(decodeURIComponent(userStr));
          console.log('[DEBUG] User from initData parsing:', user);
          return {
            id: user.id.toString(),
            firstName: user.first_name || user.username || 'Друг'
          };
        }
      } catch (error) {
        console.error('[ERROR] Failed to parse initData:', error);
      }
    }

    // Способ 3: Через startParam (если передан в deep link)
    if (webApp.startParam) {
      console.log('[DEBUG] Using startParam as user_id:', webApp.startParam);
      return {
        id: webApp.startParam,
        firstName: 'Пользователь'
      };
    }

    console.log('[DEBUG] No user data found');
    return null;
  };

  // 🔧 Функция для создания постоянного development user_id
  const getDevelopmentUserId = (): string => {
    // Пробуем получить из localStorage
    let devUserId = localStorage.getItem('dev_user_id');
    
    if (!devUserId) {
      // Создаем новый постоянный ID
      devUserId = 'dev_user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dev_user_id', devUserId);
      console.log('[DEBUG] Created new dev user_id:', devUserId);
    } else {
      console.log('[DEBUG] Using existing dev user_id:', devUserId);
    }
    
    return devUserId;
  };

  // Инициализация приложения
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('[DEBUG] Starting app initialization...');

        const webApp = getTelegramWebApp();
        let currentUserId: string;
        let currentUserName: string;
        let telegramDetected = false;

        if (webApp) {
          console.log('[DEBUG] Telegram environment detected');
          setIsTelegram(true);
          telegramDetected = true;
          
          // Инициализируем Telegram WebApp
          webApp.ready();
          webApp.expand();
          
          // Получаем данные пользователя
          const telegramUser = await getTelegramUser();
          
          if (telegramUser) {
            currentUserId = telegramUser.id;
            currentUserName = telegramUser.firstName;
            console.log('[DEBUG] Authenticated Telegram user:', { 
              id: currentUserId, 
              name: currentUserName 
            });
          } else {
            // Если в Telegram, но нет данных пользователя
            currentUserId = 'telegram_anon_' + Math.random().toString(36).substr(2, 6);
            currentUserName = 'Аноним';
            console.log('[DEBUG] Using anonymous Telegram user:', currentUserId);
          }
        } else {
          // Development mode
          console.log('[DEBUG] Development mode detected');
          setIsTelegram(false);
          telegramDetected = false;
          
          currentUserId = getDevelopmentUserId();
          currentUserName = 'Разработчик';
          console.log('[DEBUG] Using development user:', { 
            id: currentUserId, 
            name: currentUserName 
          });
        }

        setUserId(currentUserId);
        setUserName(currentUserName);

        // Загружаем данные из Supabase
        console.log('[DEBUG] Loading data from Supabase for user_id:', currentUserId);
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('[ERROR] Supabase load failed:', error);
        } else if (data) {
          console.log('[DEBUG] Data loaded successfully from Supabase:', {
            flights: data.flights?.length || 0,
            airlines: data.airlines?.length || 0
          });
          setFlights(data.flights || []);
          setAirlines(data.airlines || []);
          setOriginCities(data.origin_cities || []);
          setDestinationCities(data.destination_cities || []);
        } else {
          console.log('[DEBUG] No data found in Supabase for this user');
          // Инициализируем пустые массивы
          setFlights([]);
          setAirlines([]);
          setOriginCities([]);
          setDestinationCities([]);
        }

      } catch (err) {
        console.error('[CRITICAL] App initialization crashed:', err);
        // Fallback значения
        setUserName('Гость');
        setUserId('error_user');
        setFlights([]);
        setAirlines([]);
        setOriginCities([]);
        setDestinationCities([]);
      } finally {
        setLoading(false);
        console.log('[DEBUG] App initialization completed');
      }
    };

    initApp();
  }, []);

  // Автоматическое сохранение в Supabase (только когда userId установлен)
  useEffect(() => {
    if (loading || !userId) return;

    const saveToSupabase = async () => {
      try {
        console.log('[DEBUG] Saving data to Supabase for user:', userId);
        
        const { error } = await supabase.from('flights').upsert(
          {
            user_id: userId,
            flights: flights,
            airlines: airlines,
            origin_cities: originCities,
            destination_cities: destinationCities,
            updated_at: new Date().toISOString(),
          },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          }
        );

        if (error) {
          console.error('[ERROR] Supabase save failed:', error);
        } else {
          console.log('[DEBUG] Data saved successfully to Supabase');
        }
      } catch (err) {
        console.error('[CRITICAL] Save to Supabase crashed:', err);
      }
    };

    // Используем debounce для избежания частых сохранений
    const timer = setTimeout(saveToSupabase, 2000);
    return () => clearTimeout(timer);
  }, [flights, airlines, originCities, destinationCities, loading, userId]);

  if (loading) {
    return (
      <div className={styles.app} style={{ textAlign: 'center', padding: '40px' }}>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <p className={styles.greeting}>
        Привет, <strong>{userName}</strong>!
      </p>
      <p style={{ fontSize: '12px', color: '#888', marginTop: '-8px' }}>
        Ваш user_id: {userId}
      </p>
      
      {/* Отладочная информация */}
      <div style={{ 
        fontSize: '10px', 
        color: isTelegram ? 'green' : 'orange', 
        marginTop: '5px',
        padding: '5px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        {isTelegram ? `✅ Telegram Web App - User ID: ${userId}` : '🛠️ Development Mode - Local Storage'}
      </div>

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('add')}
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.active : ''}`}
        >
          ➕ Добавить
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
        >
          📚 История
        </button>
      </div>

      {activeTab === 'add' && (
        <AddFlightForm
          flights={flights}
          airlines={airlines}
          originCities={originCities}
          destinationCities={destinationCities}
          onAdd={(newFlight) => {
            const updatedFlights = [...flights, newFlight];
            setFlights(updatedFlights);
            
            // Обновляем списки уникальных значений
            if (newFlight.airline && !airlines.includes(newFlight.airline)) {
              setAirlines([...airlines, newFlight.airline]);
            }
            if (newFlight.origin && !originCities.includes(newFlight.origin)) {
              setOriginCities([...originCities, newFlight.origin]);
            }
            if (newFlight.destination && !destinationCities.includes(newFlight.destination)) {
              setDestinationCities([...destinationCities, newFlight.destination]);
            }
          }}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView 
          flights={flights} 
          onDelete={(id) => setFlights(flights.filter(f => f.id !== id))} 
        />
      )}
    </div>
  );
};

export default App;