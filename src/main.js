import './style.css';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

document.addEventListener('DOMContentLoaded', () => {

    const firebaseConfig = {
        apiKey: import.meta.env.VITE_API_KEY,
        authDomain: import.meta.env.VITE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_APP_ID
    };

    // Inisialisasi Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let tasksCollection; // Akan ditentukan setelah user login
    let unsubscribe; // Untuk menghentikan listener saat logout

    const authContainer = document.getElementById('auth-container');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    // Form Login
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    
    // Form Register
    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    const registerButton = document.getElementById('register-button');
    
    // Tampilan Aplikasi Utama
    const appContainer = document.getElementById('app-container');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    
    // Form Tugas
    const reminderForm = document.getElementById('reminder-form');
    const taskInput = document.getElementById('task-input');
    const timeInput = document.getElementById('time-input');
    const taskList = document.getElementById('task-list');

    let activeTimeouts = {};
    
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.style.display = 'none';
        loginView.style.display = 'block';
    });

    registerButton.addEventListener('click', () => {
        const email = registerEmail.value;
        const password = registerPassword.value;
    
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Jika berhasil, tampilkan pesan sukses
                Swal.fire('Sukses!', 'Akun berhasil dibuat. Silakan login.', 'success');
                registerView.style.display = 'none';
                loginView.style.display = 'block';
            })
            .catch(error => {
                // Jika gagal, periksa kode errornya
                let pesanError = "Oops... terjadi kesalahan. Coba lagi nanti."; // Pesan default
    
                switch (error.code) {
                    case "auth/weak-password":
                        pesanError = "Minimal 6 karakter sayang.";
                        break;
                    case "auth/email-already-in-use":
                        pesanError = "Duh, email ini sudah terdaftar. Coba login saja.";
                        break;
                    case "auth/invalid-email":
                        pesanError = "Format email-nya sepertinya salah, coba cek lagi beb.";
                        break;
                }
    
                // Tampilkan pesan error kustom kita
                Swal.fire('Oops...', pesanError, 'error');
            });
    });

    loginButton.addEventListener('click', () => {
        const email = loginEmail.value;
        const password = loginPassword.value;
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => Swal.fire('Oops...', 'Email atau password salah.', 'error'));
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            // Pengguna sedang login
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userEmailSpan.textContent = user.email;

            // Arahkan ke koleksi tugas yang spesifik untuk user ini
            tasksCollection = db.collection('users').doc(user.uid).collection('tasks');
            loadTasks();
        } else {
            // Pengguna logout
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            taskList.innerHTML = '';
            Object.values(activeTimeouts).forEach(clearTimeout);
            activeTimeouts = {};
            // Hentikan listener Firestore saat logout
            if (unsubscribe) unsubscribe();
        }
    });

  function loadTasks() {
    // Hentikan listener lama sebelum memulai yang baru
    if (unsubscribe) unsubscribe();

    unsubscribe = tasksCollection.orderBy('completed').orderBy('time').onSnapshot(snapshot => {
        
        // CUKUP TAMBAHKAN SATU BARIS INI
        console.log("Menerima data dari Firestore:", snapshot.docs); 

        // Sisa kodenya biarkan seperti semula
        taskList.innerHTML = '';
        Object.values(activeTimeouts).forEach(clearTimeout);
        activeTimeouts = {};

        snapshot.docs.forEach(doc => {
            renderTask(doc);
        });
    });
}
    reminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        const reminderTimeValue = timeInput.value;

        if (taskText === '' || reminderTimeValue === '') {
            Swal.fire('Oops...', 'Mohon isi nama tugas dan waktunya.', 'warning');
            return;
        }
        const reminderTime = new Date(reminderTimeValue);
        if (reminderTime <= new Date()) {
            Swal.fire('Oops...', 'Waktu pengingat harus di masa depan.', 'warning');
            return;
        }

        tasksCollection.add({
            text: taskText,
            time: firebase.firestore.Timestamp.fromDate(reminderTime),
            completed: false
        }).then(() => {
            reminderForm.reset();
        });
    });
    
    function renderTask(doc) {
        const task = doc.data();
        const li = document.createElement('li');
        li.setAttribute('data-id', doc.id);

        if (task.completed) {
            li.classList.add('completed');
        }

        const reminderTime = task.time.toDate();
        const now = new Date();

        const formattedTime = reminderTime.toLocaleString('id-ID', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        li.innerHTML = `
            <div class="task-info">
                <span>${task.text}</span>
                <span class="task-time">Waktu: ${formattedTime}</span>
            </div>
            <div class="task-actions">
                <span class="complete-btn">${task.completed ? '✔️' : '⚪'}</span>
                <button class="delete-btn">Hapus</button>
            </div>
        `;

        taskList.appendChild(li);

        const completeButton = li.querySelector('.complete-btn');
        completeButton.addEventListener('click', () => {
            toggleTaskStatus(doc.id, task.completed);
        });

        const deleteButton = li.querySelector('.delete-btn');
        deleteButton.addEventListener('click', () => {
            confirmDeleteTask(doc.id, task.text);
        });
        
        if (reminderTime > now && !task.completed) {
            const delay = reminderTime.getTime() - now.getTime();
            
            if (activeTimeouts[doc.id]) clearTimeout(activeTimeouts[doc.id]);

            const timeoutId = setTimeout(() => {
                Swal.fire({
                    title: '✨ Waktunya! ✨',
                    text: `Jangan lupa kerjakan: "${task.text}"`,
                    icon: 'success',
                    confirmButtonText: 'Oke, Aku Siap!',
                    confirmButtonColor: '#f06292',
                }).then(() => {
                    deleteTask(doc.id);
                });
            }, delay);
            
            activeTimeouts[doc.id] = timeoutId;
        }
    }

    function toggleTaskStatus(id, currentStatus) {
        tasksCollection.doc(id).update({
            completed: !currentStatus
        }).then(() => {
            if (!currentStatus === true && activeTimeouts[id]) {
                clearTimeout(activeTimeouts[id]);
                delete activeTimeouts[id];
            }
        });
    }

    function confirmDeleteTask(id, text) {
        Swal.fire({
            title: 'Yakin mau hapus?',
            text: `Tugas "${text}" akan hilang selamanya lho!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f06292',
            cancelButtonColor: '#bdbdbd',
            confirmButtonText: 'Ya, hapus saja!',
            cancelButtonText: 'Eh, jangan deh'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteTask(id);
            }
        });
    }
    
    function deleteTask(id) {
        tasksCollection.doc(id).delete().then(() => {
            if (activeTimeouts[id]) {
                clearTimeout(activeTimeouts[id]);
                delete activeTimeouts[id];
            }
        });
    }
});
