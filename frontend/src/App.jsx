import React, { useState } from 'react';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        resolve(null);
        return;
      }
      
      // Request user's permission and get current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Browser geolocation failed or was denied:', error);
          resolve(null); // Fallback to IP geolocation
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0
          // Removed timeout to allow the user plenty of time to click "Allow" on the browser prompt without failing
        }
      );
    });
  };

  const detectLocation = async () => {
    setLoading(true);
    setError(null);
    setLocation(null);

    try {
      // 1. Fetch precise browser coordinates (if allowed)
      const coords = await getCoordinates();

      // 2. Query backend locator API
      const response = await fetch('http://localhost:5000/api/locate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coords || {}),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();
      setLocation(data);
    } catch (err) {
      console.error(err);
      setError('عذراً، فشل تحديد الموقع. يرجى التحقق من اتصال السيرفر والمحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Background Decorative Glow Elements */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <header className="app-header">
        <div className="logo">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="logo-text">مكتشف المواقع الجغرافية</span>
        </div>
      </header>

      <main className="main-content">
        {!location && !loading && !error && (
          <div className="welcome-section fade-in">
            <div className="hero-icon-container">
              <svg className="hero-icon animated-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <h1 className="hero-title">تحديد موقعك الجغرافي بنقرة واحدة</h1>
            <p className="hero-subtitle">
              قم بالاستعلام الفوري عن عنوان IP الخاص بك وتحديد دولتك ومدينتك وشبكة الاتصال بدقة.
            </p>
            
            <button className="locate-btn" onClick={detectLocation}>
              <span className="btn-glow"></span>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              تحديد الموقع
            </button>
          </div>
        )}

        {loading && (
          <div className="loading-section fade-in">
            <div className="loader-container">
              <div className="spinner"></div>
              <svg className="loader-map-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 className="loading-text">جاري فحص الـ IP وتحديد الموقع...</h3>
            <p className="loading-subtext">يتصل بالسيرفر ويستعلم عن إحداثيات موقعك الجغرافي</p>
          </div>
        )}

        {error && (
          <div className="error-section fade-in">
            <div className="error-icon-container">
              <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="error-title">فشل الاتصال</h3>
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={detectLocation}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {location && !loading && (
          <div className="result-section fade-in">
            <div className="card-header">
              <div className="status-badge">
                <span className="pulse-dot"></span>
                تم تحديد الموقع بنجاح
              </div>
            </div>

            <div className="result-card">
              <div className="flag-container">
                {location.countryCode ? (
                  <img 
                    src={`https://flagcdn.com/w160/${location.countryCode.toLowerCase()}.png`} 
                    alt={location.country} 
                    className="country-flag"
                  />
                ) : (
                  <div className="fallback-flag">🌐</div>
                )}
              </div>

              <h2 className="location-name">{location.city}، {location.country}</h2>
              <div className="ip-badge-container">
                <span className="ip-label">عنوان الـ IP:</span>
                <span className="ip-value">{location.ip}</span>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">الدولة</span>
                  <span className="detail-val">{location.country} ({location.countryCode})</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">المنطقة / المحافظة</span>
                  <span className="detail-val">{location.regionName || 'غير متوفر'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">المدينة</span>
                  <span className="detail-val">{location.city}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">مزود الخدمة (ISP)</span>
                  <span className="detail-val">{location.isp || 'غير متوفر'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">خط العرض</span>
                  <span className="detail-val">{location.lat || 'غير متوفر'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">خط الطول</span>
                  <span className="detail-val">{location.lon || 'غير متوفر'}</span>
                </div>
              </div>

              <div className="database-badge">
                <svg className="db-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                </svg>
                <span>تم تخزين هذه العملية في قاعدة البيانات والملف local بنجاح</span>
              </div>
            </div>

            <button className="reset-btn" onClick={() => setLocation(null)}>
              <svg className="reset-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              تحديد موقع جديد
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer-info">
        <p>مشروع تحديد الموقع الجغرافي • Express + React + Mongoose</p>
      </footer>
    </div>
  );
}

export default App;
