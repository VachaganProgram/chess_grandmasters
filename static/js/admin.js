const API_URL = 'http://127.0.0.1:5000';

window.addEventListener('pageshow', function(event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        console.log('⚠️ Page loaded from cache, re-checking auth...');
        verifyAdminAuth().then(isAuth => {
            if (!isAuth) {
                window.location.replace('/login');
            }
        });
    }
});

async function verifyAdminAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
        return false;
    }

    if (role !== 'admin') {
        console.log('❌ Access denied: not an admin. Role:', role);
        localStorage.clear();
        alert('⛔ Access denied! Admin rights required.');
        window.location.href = '/login';
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/masters/list/users/masters`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.log('❌ Token invalid or insufficient permissions');
            localStorage.clear();
            alert('⛔ Session expired or access denied!');
            window.location.href = '/login';
            return false;
        }

        console.log('✅ Admin authentication verified');
        return true;
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        localStorage.clear();
        window.location.href = '/login';
        return false;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await verifyAdminAuth();
    
    if (isAuth) {
        const username = localStorage.getItem('username') || 'Admin';
        const role = localStorage.getItem('role') || 'admin';

        document.getElementById('username').textContent = `Welcome, ${username}`;
        document.getElementById('role').textContent = role;
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
        getMasters();
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

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (res.status === 401 || res.status === 403) {
        console.log('❌ Unauthorized, logging out');
        logout();
        return { res: null, data: null };
    }
    
    return { res, data: await res.json() };
}

async function getMasters() {
    const r = document.getElementById('masters_list');
    r.style.display = 'block';
    r.textContent = 'Loading...';
    
    const { res, data } = await apiFetch(`${API_URL}/api/v1/masters/get`);

    if (!res || !res.ok) {
        r.textContent = data?.error || 'Failed to load';
        return;
    }

    const sorted = data.data.sort((a, b) => a.id - b.id);
    r.textContent = sorted.map(m => `${m.id}. ${m.name} (${m.nationality})`).join('\n');
}

async function getMaster() {
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

async function createMaster() {
    const body = {
        name: document.getElementById('create_master_name').value.trim(),
        title_years: document.getElementById('create_master_years').value.trim() || null,
        birth_year: document.getElementById('create_master_birth_year').value ? +document.getElementById('create_master_birth_year').value : null,
        death_year: document.getElementById('create_master_death_year').value ? +document.getElementById('create_master_death_year').value : null,
        nationality: document.getElementById('create_master_country').value.trim() || null,
        favorite_piece: document.getElementById('create_master_piece').value.trim()
    };

    if (!body.name || !body.birth_year || !body.nationality || !body.favorite_piece) {
        const r = document.getElementById('create_master_res');
        r.style.display = 'block';
        r.textContent = 'Please fill out all required fields (Name, Birth year, Country, Favorite piece).';
        return;
    }

    const r = document.getElementById('create_master_res');
    r.style.display = 'block';
    r.textContent = 'Creating...';

    const { res, data } = await apiFetch(`${API_URL}/api/v1/masters/post`, {
        method: 'POST',
        body: JSON.stringify(body)
    });

    if (!res) return;

    r.textContent = res.ok ? 'Master Created' : data.error;
    
    if (res.ok) {
        document.getElementById('create_master_name').value = '';
        document.getElementById('create_master_years').value = '';
        document.getElementById('create_master_birth_year').value = '';
        document.getElementById('create_master_death_year').value = '';
        document.getElementById('create_master_country').value = '';
        document.getElementById('create_master_piece').value = '';
        getMasters();
    }
}

async function attachMaster() {
    const masterId = document.getElementById('attach_master_id').value;
    const userId = document.getElementById('attach_user_id').value;
    const responseBox = document.getElementById('attach_res');

    if (!masterId || !userId) {
        responseBox.style.display = 'block';
        responseBox.textContent = 'Please provide both Master ID and User ID.';
        return;
    }

    const userIdNum = +userId;

    if (isNaN(userIdNum)) {
        responseBox.style.display = 'block';
        responseBox.textContent = 'Invalid User ID. Please provide a valid numeric User ID.';
        return;
    }

    responseBox.style.display = 'block';
    responseBox.textContent = 'Attaching...';

    const { res, data } = await apiFetch(`${API_URL}/api/v1/masters/attach/master/${masterId}`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userIdNum })
    });

    if (!res) return;

    responseBox.textContent = res.ok ? 'Master successfully attached to user!' : `Error: ${data.error}`;
}

async function deleteMaster() {
    const r = document.getElementById('delete_master_res');
    r.style.display = 'block';

    const idToDelete = +document.getElementById('delete_master_id').value;
    if (!idToDelete) {
        r.textContent = 'Please provide a valid Master ID';
        return;
    }

    r.textContent = 'Deleting...';

    const { res, data } = await apiFetch(`${API_URL}/api/v1/masters/delete/${idToDelete}`, { method: 'DELETE' });
    
    if (!res) return;
    
    if (!res.ok) {
        r.textContent = data.error;
        return;
    }

    r.textContent = 'Deleted successfully!';
    document.getElementById('delete_master_id').value = '';
    getMasters();
}

async function updateMaster() {
    const r = document.getElementById('update_master_res');
    r.style.display = 'block';

    const id = +document.getElementById('update_master_id').value;
    if (!id) {
        r.textContent = 'Please provide a valid Master ID';
        return;
    }

    const body = {};
    if (document.getElementById('update_master_name').value.trim()) body.name = document.getElementById('update_master_name').value.trim();
    if (document.getElementById('update_master_years').value.trim()) body.title_years = document.getElementById('update_master_years').value.trim();
    if (document.getElementById('update_master_birth_year').value) body.birth_year = +document.getElementById('update_master_birth_year').value;
    if (document.getElementById('update_master_death_year').value) body.death_year = +document.getElementById('update_master_death_year').value;
    if (document.getElementById('update_master_country').value.trim()) body.nationality = document.getElementById('update_master_country').value.trim();
    if (document.getElementById('update_master_piece').value.trim()) body.favorite_piece = document.getElementById('update_master_piece').value.trim();

    if (Object.keys(body).length === 0) {
        r.textContent = 'No fields to update';
        return;
    }

    r.textContent = 'Updating...';

    const { res, data } = await apiFetch(`${API_URL}/api/v1/masters/update/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
    });

    if (!res) return;

    r.textContent = res.ok ? 'Master Updated' : data.error;
    if (res.ok) getMasters();
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (match) {
        const escape = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        };
        return escape[match];
    });
}

async function listUsers() {
    const usersListBox = document.getElementById('users_list');
    usersListBox.style.display = 'block';
    usersListBox.textContent = 'Loading...';

    const { res, data } = await apiFetch(`${API_URL}/api/v1/masters/list/users/masters`);

    if (!res || !res.ok) {
        usersListBox.textContent = `Error: ${data?.error || 'Failed to load'}`;
        return;
    }

    const usersMap = {};
    data.data.forEach(u => {
        if (!usersMap[u.user_id]) {
            usersMap[u.user_id] = {
                username: escapeHtml(u.username),
                masters: []
            };
        }
        if (u.master_id) {
            usersMap[u.user_id].masters.push(`${u.master_id} (${u.master_name})`);
        }
    });

    usersListBox.textContent = Object.entries(usersMap).map(([id, user]) => {
        const mastersStr = user.masters.length ? user.masters.join(', ') : 'None';
        return `User ID: ${id}, ${user.username} → Masters: ${mastersStr}`;
    }).join('\n');
}

document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const id = document.activeElement.id;
    e.preventDefault();

    if (id === 'master_id') getMaster();
    if (id.startsWith('create_')) createMaster();
    if (id.startsWith('attach_')) attachMaster();
    if (id === 'delete_master_id') deleteMaster();
});
