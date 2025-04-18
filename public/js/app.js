// public/js/app.js
const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      // 認證相關
      isLoggedIn: false,
      currentUser: null,
      loginForm: {
        username: '',
        password: ''
      },
      loginLoading: false,
      loginError: null,

      // 新增密碼顯示控制
      showPassword: false,

      // 視圖控制
      currentView: 'locks',
      
      // 硬體鎖管理
      locks: [],
      lockSearchText: '', // 確保初始為空字符串
      lockStatusFilter: '',
      lockSortBy: 'id-desc',
      showAddLockModal: false,
      editingLock: null,
      lockForm: {
        company_lock_id: '',
        hardware_id: '',
        project_name: '',
        assigned_to: '',
        department: '',
        status: '在庫',
        features: '',  // 添加特徵欄位
        remarks: ''
      },
      
      // 使用者管理
      users: [],
      showAddUserModal: false,
      userForm: {
        username: '',
        password: '',
        is_admin: false
      },
      
      // 重設密碼
      showResetPasswordModal: false,
      selectedUser: null,
      resetPasswordForm: {
        new_password: ''
      },
      
      // 變更密碼
      showChangePasswordModal: false,
      changePasswordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      changePasswordError: null,
      
      // 刪除確認
      showDeleteModal: false,
      itemToDelete: null,
      deleteType: null,
      
      // 通用
      saving: false,
      toastMessage: '',
      toastTitle: '',
      toastType: 'success'
    };
  },
  
  computed: {
    // 過濾和排序硬體鎖
    filteredLocks() {
      let result = [...this.locks];
      
      // 搜尋過濾
      if (this.lockSearchText) {
        const searchText = this.lockSearchText.toLowerCase();
        result = result.filter(lock => 
          lock.company_lock_id.toLowerCase().includes(searchText) ||
          lock.hardware_id.toLowerCase().includes(searchText) ||
          lock.project_name.toLowerCase().includes(searchText) ||
          lock.assigned_to.toLowerCase().includes(searchText) ||
          lock.department.toLowerCase().includes(searchText)
        );
      }
      
      // 狀態過濾
      if (this.lockStatusFilter) {
        result = result.filter(lock => lock.status === this.lockStatusFilter);
      }
      
      // 排序
      switch (this.lockSortBy) {
        case 'id-desc':
          result.sort((a, b) => b.id - a.id);
          break;
        case 'id-asc':
          result.sort((a, b) => a.id - b.id);
          break;
        case 'company_lock_id':
          result.sort((a, b) => a.company_lock_id.localeCompare(b.company_lock_id));
          break;
        case 'hardware_id':
          result.sort((a, b) => a.hardware_id.localeCompare(b.hardware_id));
          break;
      }
      
      return result;
    }
  },
  
  created() {
    console.log('Vue 應用已創建');
    // 檢查使用者是否已登入
    this.checkAuthStatus();
    
    // 為 window 添加錯誤處理器
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('全局錯誤:', message, 'at', source, lineno, colno, error);
      this.showToast('錯誤', '系統發生錯誤，請查看控制台', 'error');
      return false;
    };
    
    // 捕獲未處理的 Promise 拒絕
    window.addEventListener('unhandledrejection', event => {
      console.error('未處理的 Promise 拒絕:', event.reason);
      this.showToast('錯誤', '非同步操作失敗，請查看控制台', 'error');
    });
    
    // 記錄應用啟動時間
    console.log('應用啟動時間:', new Date().toISOString());
    
    // 檢查瀏覽器支援
    this.checkBrowserSupport();
  },
  
  watch: {
    // 監視登入狀態變化，載入相應資料
    isLoggedIn(newVal) {
      if (newVal) {
        this.fetchLocks();
        if (this.currentUser.is_admin) {
          this.fetchUsers();
        }
      }
    },
    
    // 移除 showAddLockModal 的監聽，改為直接使用方法
    
    // 其他現有監聽器
    showAddUserModal(val) {
      this.toggleModal('addUserModal', val);
    },
    showResetPasswordModal(val) {
      this.toggleModal('resetPasswordModal', val);
    },
    showChangePasswordModal(val) {
      this.toggleModal('changePasswordModal', val);
    }
  },
  
  methods: {
    // 認證相關方法
    async checkAuthStatus() {
      try {
        const response = await fetch('/api/auth/current-user', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.user) {
          // 即使服務器認為用戶已登入，也不自動設置登入狀態
          // 將用戶登出，確保需要重新登入
          try {
            await fetch('/api/auth/logout', { 
              method: 'POST',
              credentials: 'include'
            });
          } catch (logoutError) {
            console.error('自動登出出錯:', logoutError);
          }
          
          // 確保前端處於未登入狀態
          this.isLoggedIn = false;
          this.currentUser = null;
        } else {
          // 確保未登入狀態
          this.isLoggedIn = false;
          this.currentUser = null;
        }
      } catch (error) {
        console.error('檢查認證狀態出錯:', error);
        // 發生錯誤時視為未登入
        this.isLoggedIn = false;
        this.currentUser = null;
      }
    },
    
    async login() {
      if (!this.loginForm.username || !this.loginForm.password) {
        this.loginError = '請輸入使用者名稱和密碼';
        return;
      }
      
      try {
        this.loginLoading = true;
        this.loginError = null;
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.loginForm),
          credentials: 'include' // 確保儲存cookies
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.currentUser = data.user;
          this.isLoggedIn = true;
          this.loginForm = { username: '', password: '' };
          
          // 登入成功後立即獲取數據
          await this.fetchLocks();
          if (this.currentUser.is_admin) {
            await this.fetchUsers();
          }
        } else {
          this.loginError = data.message || '登入失敗';
        }
      } catch (error) {
        console.error('登入出錯:', error);
        this.loginError = '無法連接到伺服器';
      } finally {
        this.loginLoading = false;
      }
    },
    
    async logout() {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        this.isLoggedIn = false;
        this.currentUser = null;
      } catch (error) {
        console.error('登出出錯:', error);
      }
    },
    
    async changePassword() {
      // 驗證表單
      if (!this.changePasswordForm.currentPassword || !this.changePasswordForm.newPassword || !this.changePasswordForm.confirmPassword) {
        this.changePasswordError = '所有欄位都是必填的';
        return;
      }
      
      if (this.changePasswordForm.newPassword !== this.changePasswordForm.confirmPassword) {
        this.changePasswordError = '新密碼與確認密碼不符';
        return;
      }
      
      this.saving = true;
      this.changePasswordError = null;
      
      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: this.changePasswordForm.currentPassword,
            newPassword: this.changePasswordForm.newPassword
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.showToast('成功', '密碼已更新', 'success');
          this.showChangePasswordModal = false;
          this.changePasswordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };
        } else {
          this.changePasswordError = data.message || '更新密碼失敗';
        }
      } catch (error) {
        console.error('變更密碼出錯:', error);
        this.changePasswordError = '無法連接到伺服器';
      } finally {
        this.saving = false;
      }
    },
    
    // 硬體鎖管理方法
    async fetchLocks() {
      try {
        // 添加時間戳參數避免瀏覽器緩存
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/locks?t=${timestamp}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 使用完全替換的方式更新陣列，確保響應式系統能檢測到變化
          this.locks = [...data.locks];
          console.log('載入了', this.locks.length, '條硬體鎖記錄');
        } else {
          console.error('獲取硬體鎖資料失敗:', data.message);
          this.showToast('錯誤', '載入硬體鎖資料失敗', 'error');
        }
      } catch (error) {
        console.error('獲取硬體鎖列表出錯:', error);
        this.showToast('錯誤', '無法載入硬體鎖資料', 'error');
      }
    },
    
    editLock(lock) {
      console.log('編輯硬體鎖:', lock);
      this.editingLock = lock;
      
      // 深拷貝資料到表單，避免直接修改原始資料
      this.lockForm = {
        company_lock_id: lock.company_lock_id || '',
        hardware_id: lock.hardware_id || '',
        project_name: lock.project_name || '',
        assigned_to: lock.assigned_to || '',
        department: lock.department || '',
        status: lock.status || '在庫',
        features: lock.features || '',
        remarks: lock.remarks || ''
      };
      
      // 顯示模態窗
      this.showAddLockModal = true;
      
      // 使用 setTimeout 確保 DOM 已更新
      setTimeout(() => {
        const modalEl = document.getElementById('addLockModal');
        if (modalEl) {
          try {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
          } catch (error) {
            console.error('顯示編輯模態窗時發生錯誤:', error);
            // 備用方案
            this.showModalFallback(modalEl);
          }
        } else {
          console.error('找不到編輯模態窗元素');
          this.showToast('錯誤', '無法開啟編輯視窗', 'error');
        }
      }, 100);
    },
    
    resetLockForm() {
      this.lockForm = {
        company_lock_id: '',
        hardware_id: '',
        project_name: '',
        assigned_to: '',
        department: '',
        status: '在庫',
        features: '',  // 添加特徵欄位
        remarks: ''
      };
      this.editingLock = null;
    },
    
    closeAddLockModal() {
      console.log('關閉硬體鎖模態窗');
      
      // 關閉模態窗
      const modalEl = document.getElementById('addLockModal');
      if (modalEl) {
        try {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          } else {
            // 備用方法
            modalEl.style.display = 'none';
            modalEl.classList.remove('show');
            document.body.classList.remove('modal-open');
            
            // 移除模態窗背景
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
              backdrop.parentNode.removeChild(backdrop);
            }
          }
        } catch (error) {
          console.error('關閉模態窗錯誤:', error);
          // 最後的備用方法
          modalEl.style.display = 'none';
        }
      }
      
      this.resetLockForm();
      this.showAddLockModal = false;
    },
    
    async saveLock() {
      console.log('保存硬體鎖');
      // 驗證表單
      if (!this.lockForm.company_lock_id || !this.lockForm.hardware_id) {
        this.showToast('錯誤', '頻威智編號和硬體鎖編號為必填項目', 'error');
        return;
      }
      
      this.saving = true;
      
      try {
        let url = '/api/locks';
        let method = 'POST';
        
        if (this.editingLock) {
          url = `/api/locks/${this.editingLock.id}`;
          method = 'PUT';
        }
        
        console.log(`發送 ${method} 請求到 ${url}`, this.lockForm);
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.lockForm),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`請求失敗: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('收到回應:', data);
        
        if (data.success) {
          this.showToast('成功', this.editingLock ? '硬體鎖已更新' : '硬體鎖已新增', 'success');
          
          // 關閉模態窗
          this.closeAddLockModal();
          
          // 儲存成功後強制重新載入資料
          await this.fetchLocks();
        } else {
          this.showToast('錯誤', data.message || '儲存失敗', 'error');
        }
      } catch (error) {
        console.error('儲存硬體鎖出錯:', error);
        this.showToast('錯誤', `無法儲存硬體鎖: ${error.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },
    
    confirmDeleteLock(lock) {
      this.itemToDelete = lock;
      this.deleteType = 'lock';
      
      // 使用 Bootstrap Modal API 直接打開模態窗
      const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
      confirmModal.show();
    },

    async deleteLock() {
      if (!this.itemToDelete || !this.itemToDelete.id) {
        console.error('無效的刪除項目', this.itemToDelete);
        this.showToast('錯誤', '刪除失敗：無效的項目', 'error');
        return;
      }
      
      console.log('正在刪除硬體鎖', this.itemToDelete.id);
      this.saving = true;
      
      try {
        const response = await fetch(`/api/locks/${this.itemToDelete.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        // 檢查回應狀態
        if (!response.ok) {
          console.error('刪除請求失敗', response.status, response.statusText);
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          this.showToast('成功', '硬體鎖已刪除', 'success');
          
          // 關閉模態窗
          const modalEl = document.getElementById('confirmDeleteModal');
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          }
          
          // 從本地數組中移除項目
          const index = this.locks.findIndex(lock => lock.id === this.itemToDelete.id);
          if (index !== -1) {
            this.locks.splice(index, 1);
          }
          
          // 同時更新服務器數據
          this.fetchLocks();
        } else {
          console.error('刪除失敗', data);
          this.showToast('錯誤', data.message || '刪除失敗', 'error');
        }
      } catch (error) {
        console.error('刪除硬體鎖出錯:', error);
        this.showToast('錯誤', '無法連接到伺服器', 'error');
      } finally {
        this.saving = false;
        this.itemToDelete = null;
      }
    },
    
    // 使用者管理方法
    async fetchUsers() {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.success) {
          this.users = data.users;
        }
      } catch (error) {
        console.error('獲取使用者列表出錯:', error);
        this.showToast('錯誤', '無法載入使用者資料', 'error');
      }
    },
    
    resetUserForm() {
      this.userForm = {
        username: '',
        password: '',
        is_admin: false
      };
    },
    
    closeAddUserModal() {
      this.showAddUserModal = false;
      this.resetUserForm();
    },
    
    async saveUser() {
      // 驗證表單
      if (!this.userForm.username || !this.userForm.password) {
        this.showToast('錯誤', '使用者名稱和密碼為必填項目', 'error');
        return;
      }
      
      this.saving = true;
      
      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.userForm)
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.showToast('成功', '使用者已新增', 'success');
          this.closeAddUserModal();
          this.fetchUsers();
        } else {
          this.showToast('錯誤', data.message || '儲存失敗', 'error');
        }
      } catch (error) {
        console.error('儲存使用者出錯:', error);
        this.showToast('錯誤', '無法連接到伺服器', 'error');
      } finally {
        this.saving = false;
      }
    },
    
    showResetPasswordModal(user) {
      this.selectedUser = user;
      this.resetPasswordForm.new_password = '';
      this.showResetPasswordModal = true;
    },
    
    closeResetPasswordModal() {
      this.showResetPasswordModal = false;
      this.selectedUser = null;
      this.resetPasswordForm.new_password = '';
    },
    
    async resetUserPassword() {
      if (!this.selectedUser) return;
      
      if (!this.resetPasswordForm.new_password) {
        this.showToast('錯誤', '請輸入新密碼', 'error');
        return;
      }
      
      this.saving = true;
      
      try {
        const response = await fetch(`/api/users/${this.selectedUser.id}/reset-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: this.resetPasswordForm.new_password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.showToast('成功', '使用者密碼已重設', 'success');
          this.closeResetPasswordModal();
        } else {
          this.showToast('錯誤', data.message || '重設密碼失敗', 'error');
        }
      } catch (error) {
        console.error('重設密碼出錯:', error);
        this.showToast('錯誤', '無法連接到伺服器', 'error');
      } finally {
        this.saving = false;
      }
    },
    
    async toggleAdminStatus(user) {
      try {
        const response = await fetch(`/api/users/${user.id}/admin-status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_admin: !user.is_admin })
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.showToast('成功', `使用者已${!user.is_admin ? '設為管理員' : '移除管理員權限'}`, 'success');
          this.fetchUsers();
        } else {
          this.showToast('錯誤', data.message || '更新權限失敗', 'error');
        }
      } catch (error) {
        console.error('更新管理員狀態出錯:', error);
        this.showToast('錯誤', '無法連接到伺服器', 'error');
      }
    },
    
    confirmDeleteUser(user) {
      this.itemToDelete = user;
      this.deleteType = 'user';
      this.showDeleteModal('confirmDeleteModal');
    },
    
    async deleteUser() {
      if (!this.itemToDelete) return;
      
      this.saving = true;
      
      try {
        const response = await fetch(`/api/users/${this.itemToDelete.id}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.showToast('成功', '使用者已刪除', 'success');
          this.fetchUsers();
          this.hideDeleteModal('confirmDeleteModal');
        } else {
          this.showToast('錯誤', data.message || '刪除失敗', 'error');
        }
      } catch (error) {
        console.error('刪除使用者出錯:', error);
        this.showToast('錯誤', '無法連接到伺服器', 'error');
      } finally {
        this.saving = false;
      }
    },
    
    // 通用方法
    setView(view) {
      this.currentView = view;
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    // 重寫 showToast 方法，避免可能的Bootstrap依賴問題
    showToast(title, message, type = 'success') {
      this.toastTitle = title;
      this.toastMessage = message;
      this.toastType = type;
      
      // 獲取 toast 元素
      const toastEl = document.getElementById('toast');
      if (!toastEl) {
        console.error('找不到 toast 元素');
        alert(`${title}: ${message}`); // 失敗時使用 alert 作為後備
        return;
      }
      
      try {
        // 使用 Bootstrap 的 Toast 物件
        const toast = new bootstrap.Toast(toastEl, {
          delay: 3000
        });
        toast.show();
      } catch (error) {
        console.error('顯示 toast 時發生錯誤:', error);
        alert(`${title}: ${message}`); // 失敗時使用 alert 作為後備
      }
    },
    
    showDeleteModal(modalId) {
      const modal = new bootstrap.Modal(document.getElementById(modalId));
      modal.show();
    },
    
    hideDeleteModal(modalId) {
      const modalEl = document.getElementById(modalId);
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      }
    },
    
    confirmDelete() {
      if (this.deleteType === 'lock') {
        this.deleteLock();
      } else if (this.deleteType === 'user') {
        this.deleteUser();
      }
    },
    
    // 通用模態視窗控制方法
    toggleModal(modalId, show) {
      console.log(`切換模態窗 ${modalId} 狀態為: ${show ? '顯示' : '隱藏'}`);
      const modalEl = document.getElementById(modalId);
      if (!modalEl) {
        console.error(`找不到 ID 為 ${modalId} 的模態窗元素`);
        return;
      }
      
      try {
        if (show) {
          // 顯示模態窗
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        } else {
          // 隱藏模態窗
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          }
        }
      } catch (error) {
        console.error(`操作模態窗 ${modalId} 時發生錯誤:`, error);
      }
    },

    // 新增硬體鎖模態窗專用方法
    openAddLockModal() {
      console.log('開啟新增硬體鎖模態窗');
      this.resetLockForm();
      this.showAddLockModal = true;
      
      const modalEl = document.getElementById('addLockModal');
      if (!modalEl) {
        console.error('找不到新增硬體鎖模態窗元素');
        this.showToast('錯誤', '無法開啟新增視窗', 'error');
        return;
      }
      
      try {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      } catch (error) {
        console.error('開啟新增硬體鎖模態窗時發生錯誤:', error);
        // 備用方案：使用原生 JavaScript
        this.showModalFallback(modalEl);
      }
    },

    // 模態窗備用顯示方法
    showModalFallback(modalEl) {
      // 添加必要的類和樣式
      modalEl.style.display = 'block';
      modalEl.classList.add('show');
      document.body.classList.add('modal-open');
      
      // 創建背景遮罩
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
      
      // 記錄狀態以供關閉時使用
      this._usingFallbackModal = true;
      this._fallbackModalBackdrop = backdrop;
      
      this.showToast('提示', '使用備用模式開啟視窗', 'info');
    },

    // 關閉新增硬體鎖模態窗
    closeAddLockModal() {
      this.showAddLockModal = false;
      
      // 處理標準模式
      const modalEl = document.getElementById('addLockModal');
      if (modalEl) {
        try {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          }
        } catch (error) {
          console.error('關閉模態窗時發生錯誤:', error);
        }
      }
      
      // 處理備用模式
      if (this._usingFallbackModal) {
        if (modalEl) {
          modalEl.style.display = 'none';
          modalEl.classList.remove('show');
        }
        document.body.classList.remove('modal-open');
        if (this._fallbackModalBackdrop && this._fallbackModalBackdrop.parentNode) {
          this._fallbackModalBackdrop.parentNode.removeChild(this._fallbackModalBackdrop);
        }
        this._usingFallbackModal = false;
        this._fallbackModalBackdrop = null;
      }
      
      this.resetLockForm();
    },

    toggleModal(modalId, show) {
      const modalEl = document.getElementById(modalId);
      if (!modalEl) return;
      
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      
      if (show) {
        if (!modalInstance) {
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }
      } else {
        if (modalInstance) {
          modalInstance.hide();
        }
      }
    },
    
    // 修復匯出功能
    exportData() {
      console.log('開始匯出資料');
      
      // 使用原始 ID 順序排序
      const sortedLocks = [...this.filteredLocks].sort((a, b) => a.id - b.id);
      
      if (sortedLocks.length === 0) {
        this.showToast('錯誤', '沒有可匯出的數據', 'error');
        return;
      }
      
      try {
        // 準備數據，保留原始 ID
        const data = sortedLocks.map(lock => ({
          'ID': lock.id,
          '頻威智編號': lock.company_lock_id || '',
          '硬體鎖編號': lock.hardware_id || '',
          '專案軟體': lock.project_name || '',
          '借用/售出對象': lock.assigned_to || '',
          '部門': lock.department || '',
          '狀態': lock.status || '',
          '特徵': lock.features || '',
          '綁定資訊': lock.binding_info || '',
          '備註': lock.remarks || '',
          '創建時間': this.formatDate(lock.created_at),
          '更新時間': this.formatDate(lock.updated_at)
        }));
        
        console.log(`準備匯出 ${data.length} 筆資料`);
        
        // 建立工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        // 設置列寬
        const wscols = [
          {wch: 8},  // ID
          {wch: 15}, // 頻威智編號
          {wch: 15}, // 硬體鎖編號
          {wch: 20}, // 專案軟體
          {wch: 25}, // 借用/售出對象
          {wch: 15}, // 部門
          {wch: 10}, // 狀態
          {wch: 20}, // 特徵
          {wch: 20}, // 綁定資訊
          {wch: 30}, // 備註
          {wch: 18}, // 創建時間
          {wch: 18}  // 更新時間
        ];
        ws['!cols'] = wscols;
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '硬體鎖記錄');
        
        // 生成檔案名稱
        const fileName = `硬體鎖記錄_${new Date().toISOString().slice(0, 10)}.xlsx`;
        
        console.log(`準備下載檔案: ${fileName}`);
        
        // 使用 XLSX.writeFile 導出文件
        XLSX.writeFile(wb, fileName);
        
        this.showToast('成功', '資料已匯出，請在下載資料夾中查看', 'success');
      } catch (error) {
        console.error('匯出資料時發生錯誤:', error);
        this.showToast('錯誤', `匯出失敗: ${error.message}`, 'error');
      }
    },

    // 新增瀏覽器功能檢查方法
    checkBrowserSupport() {
      const features = {
        'Fetch API': typeof fetch !== 'undefined',
        'Promises': typeof Promise !== 'undefined',
        'localStorage': typeof localStorage !== 'undefined',
        'Bootstrap': typeof bootstrap !== 'undefined',
        'XLSX': typeof XLSX !== 'undefined'
      };
      
      console.log('瀏覽器功能支援檢查:', features);
      
      // 檢查關鍵功能
      if (!features['Fetch API'] || !features['Promises']) {
        this.showToast('警告', '您的瀏覽器可能不支援所有功能，建議升級', 'warning');
      }
      
      if (!features['Bootstrap']) {
        console.error('缺少 Bootstrap 支援，模態視窗可能無法正常工作');
      }
      
      if (!features['XLSX']) {
        console.error('缺少 XLSX 支援，匯出功能可能無法正常工作');
      }
    },

    handleSearchInput(event) {
      // 確保值不會莫名其妙變回 admin
      this.lockSearchText = event.target.value;
      console.log('搜尋文字更新為:', this.lockSearchText);
    },

    // 拖曳相關方法
    dragStart(event, lock) {
      // 只有在「全部狀態」的情況下才允許拖曳排序
      if (this.lockStatusFilter !== '') {
        event.preventDefault();
        return;
      }
      
      console.log('開始拖曳:', lock.id);
      event.dataTransfer.setData('text/plain', lock.id);
      event.dataTransfer.effectAllowed = 'move';
    },

    drop(event, targetLock) {
      // 只有在「全部狀態」的情況下才允許拖曳排序
      if (this.lockStatusFilter !== '') {
        return;
      }
      
      const sourceId = event.dataTransfer.getData('text/plain');
      const targetId = targetLock.id;
      
      if (sourceId === targetId) {
        return;
      }
      
      console.log(`拖曳 ID:${sourceId} 到 ID:${targetId}`);
      
      // 找到源和目標在陣列中的位置
      const sourceIndex = this.locks.findIndex(lock => lock.id == sourceId);
      const targetIndex = this.locks.findIndex(lock => lock.id == targetId);
      
      if (sourceIndex === -1 || targetIndex === -1) {
        console.error('找不到拖曳的項目');
        return;
      }
      
      // 複製一個陣列進行操作
      const locks = [...this.locks];
      
      // 移動項目
      const [movedItem] = locks.splice(sourceIndex, 1);
      locks.splice(targetIndex, 0, movedItem);
      
      // 更新 Vue 中的數據 (更新顯示)
      this.locks = locks;
      
      // 更新顯示的序號
      this.locks.forEach((lock, index) => {
        lock.display_id = index + 1;
      });
      
      // 準備要發送到伺服器的排序數據
      const orders = this.locks.map((lock, index) => ({
        id: lock.id,
        order: index + 1
      }));
      
      // 發送更新請求到伺服器
      this.updateSortOrder(orders);
    },

    async updateSortOrder(orders) {
      try {
        console.log('更新排序順序:', orders);
        
        const response = await fetch('/api/locks/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders }),
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.showToast('成功', '排序已更新', 'success');
        } else {
          console.error('更新排序失敗:', data.message);
          this.showToast('錯誤', '更新排序失敗', 'error');
          // 重新獲取數據以恢復原始排序
          await this.fetchLocks();
        }
      } catch (error) {
        console.error('更新排序時發生錯誤:', error);
        this.showToast('錯誤', '無法連接到伺服器', 'error');
        // 重新獲取數據以恢復原始排序
        await this.fetchLocks();
      }
    },

    // 刷新頁面
    refreshPage() {
      console.log('刷新頁面');
      window.location.reload();
    }
  }
});

app.mount('#app');