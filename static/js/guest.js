const API_URL = 'http://127.0.0.1:5000';

window.addEventListener('pageshow', function(event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        console.log('⚠️ Page loaded from cache, re-checking auth...');
        verifyAuth().then(isAuth => {
            if (!isAuth) {
                window.location.replace('/login');
            }
        });
    }
});

async function verifyAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
        return false;
    }

    if (role !== 'guest') {
        console.log('❌ Wrong role for this page:', role);
        localStorage.clear();
        window.location.href = '/login';
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/masters/get`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.log('❌ Token invalid or expired');
            localStorage.clear();
            window.location.href = '/login';
            return false;
        }

        console.log('✅ Authentication verified');
        return true;
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        localStorage.clear();
        window.location.href = '/login';
        return false;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await verifyAuth();
    
    if (isAuth) {
        const username = localStorage.getItem('username') || 'Guest';
        document.getElementById('username-display').textContent = `Welcome, ${username}`;
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
        getAllMasters();
    }
});

function logout() {
    console.log('🔓 Logging out...');
    localStorage.clear();
    sessionStorage.clear();
    
    document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    window.location.replace('/login');
}

async function apiFetch(url) {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (res.status === 401) {
        console.log('❌ Token expired, logging out');
        logout();
        return { res: null, data: null };
    }
    
    return { res, data: await res.json() };
}
async function getAllMasters(){
    const box = document.getElementById('masters_list');
    box.style.display = 'block';
    box.textContent = 'Loading...';

    const { res, data } = await apiFetch(`${API_URL}/api/v1/masters/get`);

    if (!res || !res.ok) {
        box.textContent = data?.error || 'Failed to load';
        return;
    }

    box.innerHTML = data.data.map(m => `
        <b>ID:</b> ${m.id}<br>
        <b>Name:</b> ${m.name}<br>
        <b>Champion years:</b> ${m.title_years}<br>
        <b>Country:</b> ${m.nationality}
    `).join('<hr>');
}
async function getMaster(){
    const id = document.getElementById('master_id').value;
    const box = document.getElementById('master_detail');

    if (!id) {
        box.style.display = 'block';
        box.textContent = 'ID required';
        return;
    }

    box.style.display = 'block';
    box.textContent = 'Loading...';

    const { res, data } = await apiFetch(`${API_URL}/api/v1/masters/get/master/${id}`);

    if (!res || !res.ok) {
        box.textContent = data?.error || 'Failed to load';
        return;
    }

    const m = data.data;
    box.innerHTML = `
        <b>ID:</b> ${m.id}<br>
        <b>Name:</b> ${m.name}<br>
        <b>Champion years:</b> ${m.title_years}<br>
        <b>Born:</b> ${m.birth_year}<br>
        <b>Died:</b> ${m.death_year || '—'}<br>
        <b>Country:</b> ${m.nationality}<br>
        <b>Favorite piece:</b> ${m.favorite_piece}
    `;
}

document.addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    const id=document.activeElement.id;
    e.preventDefault();
    if(id==='master_id')getMaster();
});

