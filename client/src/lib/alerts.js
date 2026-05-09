import Swal from 'sweetalert2';
import { toast } from 'sonner';

const baseConfig = {
  background: '#0f172a',
  color: '#f8fafc',
  confirmButtonColor: '#2563eb',
  cancelButtonColor: '#475569',
  reverseButtons: true,
  customClass: {
    popup: 'swal-popup',
    title: 'swal-title',
    htmlContainer: 'swal-content',
    confirmButton: 'swal-confirm',
    cancelButton: 'swal-cancel'
  }
};

export const showToast = ({ icon = 'success', title, text, timer = 2600 }) => {
  if (icon === 'success') {
    toast.success(title || 'Success', { description: text, duration: timer });
  } else if (icon === 'error') {
    toast.error(title || 'Error', { description: text, duration: timer });
  } else if (icon === 'info') {
    toast.info(title || 'Info', { description: text, duration: timer });
  } else {
    toast(title || 'Notification', { description: text, duration: timer });
  }
};

export const showErrorAlert = (title, text) => toast.error(title || 'Error', { description: text, duration: 4000 });

export const showSuccessAlert = (title, text) => toast.success(title || 'Success', { description: text, duration: 4000 });

export const showInfoAlert = (title, text, options = {}) => toast.info(title || 'Info', { description: text, duration: 4000 });

export const confirmAction = async ({
  cancelButtonText = 'Cancel',
  confirmButtonText = 'Continue',
  icon = 'question',
  text,
  title
}) => {
  const result = await Swal.fire({
    ...baseConfig,
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText
  });

  return result.isConfirmed;
};

export const promptRepairUpdate = async ({ currentTechnician = '' } = {}) => {
  const escapedTechnician = currentTechnician.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  const result = await Swal.fire({
    ...baseConfig,
    title: 'Update Maintenance Request',
    html: `
      <div class="swal-form-grid">
        <label class="swal-label" for="swal-repair-response">Tenant update</label>
        <textarea id="swal-repair-response" class="swal2-textarea" placeholder="Explain what is happening next"></textarea>
        <label class="swal-label" for="swal-repair-technician">Assigned technician</label>
        <input id="swal-repair-technician" class="swal2-input" value="${escapedTechnician}" placeholder="Name or phone number (optional)" />
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Save Update',
    cancelButtonText: 'Cancel',
    preConfirm: () => {
      const response = document.getElementById('swal-repair-response')?.value?.trim();
      const technician = document.getElementById('swal-repair-technician')?.value?.trim() || '';

      if (!response) {
        Swal.showValidationMessage('Enter the update that should be sent to the tenant.');
        return null;
      }

      return {
        response,
        technician
      };
    }
  });

  return result.isConfirmed ? result.value : null;
};
