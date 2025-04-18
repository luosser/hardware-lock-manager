<template>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>頻威智編號</th>
        <th>硬體鎖編號</th>
        <th>公司</th>
        <th>借用/售出對象</th>
        <th>專案軟體</th>
        <th>特徵</th>
        <th>綁定資訊</th>
        <th>狀態</th>
        <th>備註</th>
        <th>更新時間</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="filteredLocks.length === 0">
        <td colspan="12" class="text-center py-3">沒有找到硬體鎖記錄</td>
      </tr>
      <tr v-for="lock in filteredLocks" :key="lock.id" class="animate__animated animate__fadeIn">
        <td>{{ lock.id }}</td>
        <td>{{ lock.company_lock_id }}</td>
        <td>{{ lock.hardware_id }}</td>
        <td>{{ lock.company }}</td>
        <td>{{ lock.assigned_to }}</td>
        <td>{{ lock.project_name }}</td>
        <td>{{ lock.features }}</td>
        <td>{{ lock.binding_info }}</td>
        <td>{{ lock.status }}</td>
        <td>{{ lock.remarks }}</td>
        <td>{{ formatDate(lock.updated_at) }}</td>
        <td>
          <button @click="editLock(lock)">編輯</button>
          <button @click="confirmDeleteLock(lock)">刪除</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  data() {
    return {
      lockForm: {
        company_lock_id: '',
        hardware_id: '',
        company: '',
        assigned_to: '',
        project_name: '',
        features: '',
        binding_info: '',
        status: '在庫',
        remarks: ''
      }
    };
  },
  methods: {
    resetLockForm() {
      this.lockForm = {
        company_lock_id: '',
        hardware_id: '',
        company: '',
        assigned_to: '',
        project_name: '',
        features: '',
        binding_info: '',
        status: '在庫',
        remarks: ''
      };
    },
    editLock(lock) {
      this.lockForm = { ...lock };
    }
  }
};
</script>
