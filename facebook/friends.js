// ==================== FRIENDS PAGE ====================
import authManager from './js/auth.js';
import friendsManager from './js/friends.js';
import UIManager from './js/ui.js';

class FriendsPage {
  constructor() {
    this.init();
  }

  async init() {
    authManager.onAuthStateChange(async (user) => {
      if (user) {
        await this.loadUserProfile();
        await this.loadAllFriendsData();
        this.setupEventListeners();
      } else {
        
      }
    });
  }

  async loadUserProfile() {
    try {
      const userData = await authManager.getCurrentUserData();
      const profileIcons = document.querySelectorAll('.profile-icon');
      const initials = UIManager.getUserInitials(userData.displayName);
      
      profileIcons.forEach(icon => {
        icon.textContent = initials;
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  async loadAllFriendsData() {
    await Promise.all([
      this.loadFriends(),
      this.loadSuggestions(),
      this.loadFriendRequests()
    ]);
  }

  async loadFriends() {
    const container = document.getElementById('all-friends');
    if (!container) return;

    const loader = UIManager.showLoading(container);

    try {
      const friends = await friendsManager.getFriendsList();

      UIManager.hideLoading(loader);

      if (friends.length === 0) {
        UIManager.showEmptyState(
          container,
          'people',
          'No friends yet',
          'Start adding friends to see them here!'
        );
        return;
      }

      const friendsHTML = friends.map(friend => this.createFriendCard(friend, 'friend')).join('');
      container.innerHTML = friendsHTML;
    } catch (error) {
      UIManager.hideLoading(loader);
      console.error('Error loading friends:', error);
    }
  }

  async loadSuggestions() {
    const container = document.getElementById('suggestions');
    if (!container) return;

    const loader = UIManager.showLoading(container);

    try {
      const suggestions = await friendsManager.getFriendSuggestions(20);

      UIManager.hideLoading(loader);

      if (suggestions.length === 0) {
        UIManager.showEmptyState(
          container,
          'people',
          'No suggestions',
          'Check back later for friend suggestions'
        );
        return;
      }

      const suggestionsHTML = suggestions.map(user => this.createFriendCard(user, 'suggestion')).join('');
      container.innerHTML = suggestionsHTML;
    } catch (error) {
      UIManager.hideLoading(loader);
      console.error('Error loading suggestions:', error);
    }
  }

  async loadFriendRequests() {
    const container = document.getElementById('requests');
    if (!container) return;

    const loader = UIManager.showLoading(container);

    try {
      const requests = await friendsManager.getPendingRequests();

      UIManager.hideLoading(loader);

      if (requests.length === 0) {
        UIManager.showEmptyState(
          container,
          'person-plus',
          'No friend requests',
          'When you receive friend requests, they will appear here'
        );
        return;
      }

      const requestsHTML = requests.map(req => this.createFriendCard(req.senderData, 'request')).join('');
      container.innerHTML = requestsHTML;
    } catch (error) {
      UIManager.hideLoading(loader);
      console.error('Error loading requests:', error);
    }
  }

  createFriendCard(user, type) {
    const initials = UIManager.getUserInitials(user.displayName);
    let actionsHTML = '';

    if (type === 'friend') {
      actionsHTML = `
        <button class="btn btn-primary btn-sm message-btn" data-user-id="${user.uid}">
          <i class="bi bi-chat"></i> Message
        </button>
        <button class="btn btn-outline-secondary btn-sm unfriend-btn" data-user-id="${user.uid}">
          <i class="bi bi-person-x"></i> Unfriend
        </button>
      `;
    } else if (type === 'suggestion') {
      actionsHTML = `
        <button class="btn btn-primary btn-sm add-friend-btn" data-user-id="${user.uid}">
          <i class="bi bi-person-plus"></i> Add Friend
        </button>
        <button class="btn btn-outline-secondary btn-sm remove-suggestion-btn" data-user-id="${user.uid}">
          <i class="bi bi-x"></i> Remove
        </button>
      `;
    } else if (type === 'request') {
      actionsHTML = `
        <button class="btn btn-primary btn-sm accept-request-btn" data-user-id="${user.uid}">
          <i class="bi bi-check"></i> Accept
        </button>
        <button class="btn btn-outline-secondary btn-sm reject-request-btn" data-user-id="${user.uid}">
          <i class="bi bi-x"></i> Reject
        </button>
      `;
    }

    return `
      <div class="friend-card" data-user-id="${user.uid}">
        <div class="friend-avatar">
          <div class="avatar-initial">${initials}</div>
        </div>
        <div class="friend-info">
          <h6 class="friend-name">${UIManager.sanitizeHTML(user.displayName || 'Unknown User')}</h6>
          <p class="friend-mutual">${user.email || ''}</p>
        </div>
        <div class="friend-actions">
          ${actionsHTML}
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    document.addEventListener('click', async (e) => {
      // Add friend
      if (e.target.closest('.add-friend-btn')) {
        const userId = e.target.closest('.add-friend-btn').dataset.userId;
        await this.sendFriendRequest(userId);
      }

      // Accept request
      if (e.target.closest('.accept-request-btn')) {
        const userId = e.target.closest('.accept-request-btn').dataset.userId;
        await this.acceptRequest(userId);
      }

      // Reject request
      if (e.target.closest('.reject-request-btn')) {
        const userId = e.target.closest('.reject-request-btn').dataset.userId;
        await this.rejectRequest(userId);
      }

      // Unfriend
      if (e.target.closest('.unfriend-btn')) {
        const userId = e.target.closest('.unfriend-btn').dataset.userId;
        await this.unfriend(userId);
      }

      // Remove suggestion
      if (e.target.closest('.remove-suggestion-btn')) {
        const card = e.target.closest('.friend-card');
        this.removeSuggestion(card);
      }

      // Message
      if (e.target.closest('.message-btn')) {
        const userId = e.target.closest('.message-btn').dataset.userId;
        this.openMessage(userId);
      }
    });
  }

  async sendFriendRequest(userId) {
    const result = await friendsManager.sendFriendRequest(userId);
    
    if (result.success) {
      UIManager.showToast('Friend request sent!', 'success');
      
      // Remove from suggestions
      const card = document.querySelector(`.friend-card[data-user-id="${userId}"]`);
      if (card) {
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
      }
    } else {
      UIManager.showToast(result.error || 'Failed to send request', 'error');
    }
  }

  async acceptRequest(userId) {
    const result = await friendsManager.acceptFriendRequest(userId);
    
    if (result.success) {
      UIManager.showToast('Friend request accepted!', 'success');
      
      // Reload data
      await this.loadAllFriendsData();
    } else {
      UIManager.showToast(result.error || 'Failed to accept request', 'error');
    }
  }

  async rejectRequest(userId) {
    const result = await friendsManager.rejectFriendRequest(userId);
    
    if (result.success) {
      UIManager.showToast('Friend request rejected', 'success');
      
      // Remove card
      const card = document.querySelector(`#requests .friend-card[data-user-id="${userId}"]`);
      if (card) {
        card.style.opacity = '0';
        setTimeout(() => {
          card.remove();
          
          // Check if empty
          const container = document.getElementById('requests');
          if (container && container.querySelectorAll('.friend-card').length === 0) {
            UIManager.showEmptyState(
              container,
              'person-plus',
              'No friend requests',
              'When you receive friend requests, they will appear here'
            );
          }
        }, 300);
      }
    } else {
      UIManager.showToast(result.error || 'Failed to reject request', 'error');
    }
  }

  async unfriend(userId) {
    const confirmed = await UIManager.confirm('Are you sure you want to remove this friend?');
    
    if (!confirmed) return;

    const result = await friendsManager.removeFriend(userId);
    
    if (result.success) {
      UIManager.showToast('Friend removed', 'success');
      
      // Remove card
      const card = document.querySelector(`#all-friends .friend-card[data-user-id="${userId}"]`);
      if (card) {
        card.style.opacity = '0';
        setTimeout(() => {
          card.remove();
          
          // Check if empty
          const container = document.getElementById('all-friends');
          if (container && container.querySelectorAll('.friend-card').length === 0) {
            UIManager.showEmptyState(
              container,
              'people',
              'No friends yet',
              'Start adding friends to see them here!'
            );
          }
        }, 300);
      }
    } else {
      UIManager.showToast(result.error || 'Failed to remove friend', 'error');
    }
  }

  removeSuggestion(card) {
    card.style.opacity = '0';
    setTimeout(() => card.remove(), 300);
  }

  openMessage(userId) {
    window.location.href = 'massenger.html';
  }
}

// Initialize page
new FriendsPage();