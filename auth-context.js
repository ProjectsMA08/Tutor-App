/* ═══════════════════════════════════════════════════════════════════
   AUTH CONTEXT — единый источник правды о текущем пользователе
   ═══════════════════════════════════════════════════════════════════
   Проблема, которую это решает:
   Раньше каждая страница (profile.html, tutor-profile.html, ...)
   самостоятельно инициализировала Firebase и сама решала, кто
   сейчас залогинен и какая у него роль. Из-за этого при переходе
   между страницами роль репетитора "терялась" — страница просто
   не знала о ней и рисовала профиль обычного пользователя.

   Решение: один модуль, который ОДИН РАЗ на странице слушает
   onAuthStateChanged, подтягивает документ users/{uid} и хранит
   { user, profile, role } в единственном объекте AuthContext.
   Все страницы импортируют его вместо того, чтобы заново решать,
   кто такой текущий пользователь, через "текущий роут" или локальные
   переменные.

   ВАЖНО: этот файл должен физически лежать рядом с profile.html и
   tutor-profile.html (в той же папке), иначе import в них упадёт и
   ВЕСЬ модульный скрипт страницы молча перестанет выполняться —
   именно это и вызвало баг с "ryby", неработающим выходом и т.д.

   Использование на странице:
     import AuthContext, { auth, db, getAuthContext } from './auth-context.js';

     const ctx = await getAuthContext();       // { user, profile, role }
     if (ctx.role === 'tutor') { ... }

     // либо подписаться на изменения (логин/логаут в рантайме):
     window.addEventListener('authcontext:ready', (e) => {
       console.log(e.detail.role); // 'tutor' | 'student' | 'guest'
     });
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBQ9UYY6uh3CgXzytNwt_r2LCwaXval9T8",
    authDomain: "tutorapp-95f48.firebaseapp.com",
    projectId: "tutorapp-95f48",
    storageBucket: "tutorapp-95f48.firebasestorage.app",
    messagingSenderId: "559214827748",
    appId: "1:559214827748:web:c77d90b72d607f6df1b4f1"
};

// getApps()/getApp() — на случай, если страница ещё где-то отдельно
// вызывает initializeApp(); не даём упасть на "duplicate app" ошибке.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/** Единственный на страницу объект состояния. Мутируется по ссылке —
 *  импортёры получают всегда актуальные значения. */
const AuthContext = {
    user: null,      // Firebase Auth User | null
    profile: null,   // документ users/{uid} ТЕКУЩЕГО авторизованного пользователя
    role: 'guest',   // 'tutor' | 'student' | 'guest' (пока идёт проверка — 'pending')
    initialized: false,
};

let _resolveFirstReady;
const _firstReady = new Promise((res) => { _resolveFirstReady = res; });

onAuthStateChanged(auth, async (user) => {
    AuthContext.user = user;

    if (user) {
        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            AuthContext.profile = snap.exists() ? snap.data() : null;
            // Роль всегда читается из Firestore, а не выводится из того,
            // какая страница сейчас открыта — это и есть фикс бага.
            AuthContext.role = AuthContext.profile?.role || 'student';
        } catch (err) {
            console.warn('[AuthContext] Не удалось загрузить профиль:', err.message);
            AuthContext.profile = null;
            AuthContext.role = 'guest';
        }
    } else {
        AuthContext.profile = null;
        AuthContext.role = 'guest';
    }

    AuthContext.initialized = true;
    window.dispatchEvent(new CustomEvent('authcontext:ready', { detail: AuthContext }));
    _resolveFirstReady(AuthContext);
});

/** Промис, который резолвится после ПЕРВОЙ проверки авторизации.
 *  Используйте это в точке входа страницы вместо того, чтобы
 *  дублировать onAuthStateChanged. */
export function getAuthContext() {
    return _firstReady;
}

export default AuthContext; 