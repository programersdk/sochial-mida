// ==================== UI HELPERS ====================

class UIManager {
  // Show toast notification
  static showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-alert ${type} show`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Show loading spinner
  static showLoading(container) {
    const loader = document.createElement('div');
    loader.className = 'loading-spinner';
    loader.innerHTML = `
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    `;
    container.appendChild(loader);
    return loader;
  }

  // Hide loading spinner
  static hideLoading(loader) {
    if (loader && loader.parentElement) {
      loader.remove();
    }
  }

  // Format timestamp
  static formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  // Get user initials
  static getUserInitials(name) {
    if (!name) return 'U';
    
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Create avatar element
  static createAvatar(name, size = 40) {
    const initials = this.getUserInitials(name);
    return `
      <div class="profile-icon" style="width: ${size}px; height: ${size}px; font-size: ${size * 0.4}px;">
        ${initials}
      </div>
    `;
  }

  // Sanitize HTML to prevent XSS
  static sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Parse text for links and convert to clickable
  static parseLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => 
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
  }

  // Show confirmation dialog
  static async confirm(message) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'flex';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h3>Confirm</h3>
          </div>
          <div class="modal-body" style="padding: 20px;">
            <p>${message}</p>
          </div>
          <div class="modal-footer" style="display: flex; gap: 10px; padding: 15px; justify-content: flex-end;">
            <button class="btn btn-secondary cancel-btn">Cancel</button>
            <button class="btn btn-primary confirm-btn">Confirm</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      modal.querySelector('.cancel-btn').onclick = () => {
        modal.remove();
        resolve(false);
      };
      
      modal.querySelector('.confirm-btn').onclick = () => {
        modal.remove();
        resolve(true);
      };
      
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(false);
        }
      };
    });
  }

  // Show empty state
  static showEmptyState(container, icon, title, message) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-${icon}"></i>
        <h4>${title}</h4>
        <p>${message}</p>
      </div>
    `;
  }

  // Debounce function
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Truncate text
  static truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Toggle element visibility
  static toggleVisibility(element) {
    if (element.style.display === 'none') {
      element.style.display = 'block';
    } else {
      element.style.display = 'none';
    }
  }

  // Scroll to element
  static scrollToElement(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Copy to clipboard
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard!', 'success');
    } catch (error) {
      this.showToast('Failed to copy', 'error');
    }
  }

  // Generate random color
  static getRandomColor() {
    const colors = [
      '#1877f2', '#42b72a', '#fa383e', '#f7b731', 
      '#8e44ad', '#e67e22', '#2ecc71', '#e74c3c'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Create post card HTML
  static createPostCard(post, isLiked, isSaved, commentsCount) {
    return `
      <div class="post-card" data-post-id="${post.postId}">
        <div class="d-flex align-items-center mb-3">
          ${this.createAvatar(post.userName, 40)}
          <div class="ms-2 flex-grow-1">
            <h6 class="mb-0">${this.sanitizeHTML(post.userName)}</h6>
            <small class="text-muted">${this.formatTimestamp(post.createdAt)}</small>
          </div>
          ${post.userId === firebaseApp?.currentUser?.uid ? `
            <button class="btn btn-sm btn-light delete-post-btn" data-post-id="${post.postId}">
              <i class="bi bi-trash"></i>
            </button>
          ` : ''}
        </div>
        
        <p class="post-content">${this.sanitizeHTML(post.textContent)}</p>
        
        <div class="post-stats d-flex justify-content-between text-muted mb-2">
          <span><i class="bi bi-heart-fill text-danger"></i> ${post.likesCount || 0}</span>
          <span>${commentsCount || post.commentsCount || 0} comments</span>
        </div>
        
        <hr>
        
        <div class="post-actions">
          <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.postId}">
            <i class="bi bi-heart${isLiked ? '-fill' : ''}"></i> Like
          </button>
          <button class="comment-btn" data-post-id="${post.postId}">
            <i class="bi bi-chat"></i> Comment
          </button>
          <button class="save-btn ${isSaved ? 'saved' : ''}" data-post-id="${post.postId}">
            <i class="bi bi-bookmark${isSaved ? '-fill' : ''}"></i> Save
          </button>
        </div>
        
        <div class="comments-section" id="comments-${post.postId}" style="display: none; margin-top: 15px;">
          <div class="comments-list" id="comments-list-${post.postId}"></div>
          
          <div class="add-comment mt-3">
            <div class="d-flex gap-2">
              <input 
                type="text" 
                class="form-control" 
                placeholder="Write a comment..." 
                id="comment-input-${post.postId}"
              />
              <button class="btn btn-primary add-comment-btn" data-post-id="${post.postId}">
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Create comment HTML
  static createCommentHTML(comment) {
    return `
      <div class="comment-item" data-comment-id="${comment.commentId}">
        <div class="d-flex">
          ${this.createAvatar(comment.userName, 32)}
          <div class="ms-2 flex-grow-1">
            <div class="comment-content">
              <strong>${this.sanitizeHTML(comment.userName)}</strong>
              <p class="mb-0">${this.sanitizeHTML(comment.commentText)}</p>
            </div>
            <div class="comment-meta d-flex gap-2 mt-1">
              <small class="text-muted">${this.formatTimestamp(comment.createdAt)}</small>
              ${comment.userId === firebaseApp?.currentUser?.uid ? `
                <small>
                  <a href="#" class="text-danger delete-comment-btn" data-comment-id="${comment.commentId}" data-post-id="${comment.postId}">Delete</a>
                </small>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default UIManager;
