// ==================== DASHBOARD PAGE ====================
import firebaseApp from './config/config.js';
import authManager from './js/auth.js';
import postManager from './js/posts.js';
import likesManager from './js/likes.js';
import commentsManager from './js/comments.js';
import savedPostsManager from './js/saved.js';
import friendsManager from './js/friends.js';
import UIManager from './js/ui.js';

class Dashboard {
  constructor() {
    this.currentUser = null;
    this.postsUnsubscribe = null;
    this.init();
  }

  async init() {
    // Check authentication
    authManager.onAuthStateChange(async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData();
        await this.setupUI();
        this.loadPosts();
        this.loadFriends();
        this.setupEventListeners();
      } else {
        
      }
    });
  }

  async loadUserData() {
    try {
      const userData = await authManager.getCurrentUserData();
      
      // Update profile icons
      const profileIcons = document.querySelectorAll('.profile-icon');
      const initials = UIManager.getUserInitials(userData.displayName);
      
      profileIcons.forEach(icon => {
        icon.textContent = initials;
      });

      // Update create post avatar
      const createAvatar = document.getElementById('create-avatar');
      if (createAvatar) {
        createAvatar.textContent = initials;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async setupUI() {
    // Setup nav search
    const navSearch = document.getElementById('navbarSearch');
    if (navSearch) {
      navSearch.addEventListener('input', UIManager.debounce((e) => {
        this.searchPosts(e.target.value);
      }, 500));
    }

    // Setup profile button
    const profileBtn = document.getElementById('open-profile-btn');
    if (profileBtn) {
      profileBtn.onclick = () => {
        window.location.href = 'profile.html';
      };
    }
  }

  async loadPosts() {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;

    // Show loading
    const loader = UIManager.showLoading(postsContainer);

    // Listen to posts in real-time
    this.postsUnsubscribe = postManager.listenToPosts(async (posts) => {
      UIManager.hideLoading(loader);
      
      if (posts.length === 0) {
        UIManager.showEmptyState(
          postsContainer,
          'file-post',
          'No posts yet',
          'Be the first to share something!'
        );
        return;
      }

      // Load likes and saved status for all posts
      const postIds = posts.map(p => p.postId);
      await Promise.all([
        likesManager.loadUserLikesForPosts(postIds),
        savedPostsManager.loadSavedStatusForPosts(postIds)
      ]);

      // Render posts
      await this.renderPosts(posts);
    });
  }

  async renderPosts(posts) {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;

    const postsHTML = await Promise.all(posts.map(async (post) => {
      const isLiked = await likesManager.isPostLikedByUser(post.postId);
      const isSaved = await savedPostsManager.isPostSaved(post.postId);
      const commentsCount = await commentsManager.getPostCommentsCount(post.postId);
      
      return UIManager.createPostCard(post, isLiked, isSaved, commentsCount);
    }));

    postsContainer.innerHTML = postsHTML.join('');
  }

  async loadFriends() {
    try {
      const friends = await friendsManager.getFriendsList();
      const friendList = document.getElementById('friendList');
      const noContactsMessage = document.getElementById('noContactsMessage');
      
      if (!friendList) return;

      if (friends.length === 0) {
        friendList.innerHTML = '';
        if (noContactsMessage) {
          noContactsMessage.classList.remove('d-none');
        }
        return;
      }

      if (noContactsMessage) {
        noContactsMessage.classList.add('d-none');
      }

      const friendsHTML = friends.map(friend => `
        <li class="contact-item d-flex align-items-center gap-2 mb-2">
          <div class="contact-avatar">${UIManager.getUserInitials(friend.displayName)}</div>
          <div class="contact-info">
            <p class="contact-name">${UIManager.sanitizeHTML(friend.displayName)}</p>
            <span class="contact-status online">Online</span>
          </div>
        </li>
      `).join('');

      friendList.innerHTML = friendsHTML;
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

  setupEventListeners() {
    // Create post button
    const postButton = document.getElementById('post-button');
    if (postButton) {
      postButton.addEventListener('click', () => this.createPost());
    }

    // Post input - Enter key
    const postInput = document.getElementById('post');
    if (postInput) {
      postInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.createPost();
        }
      });
    }

    // Event delegation for dynamic elements
    document.addEventListener('click', async (e) => {
      // Like button
      if (e.target.closest('.like-btn')) {
        const postId = e.target.closest('.like-btn').dataset.postId;
        await this.toggleLike(postId, e.target.closest('.like-btn'));
      }

      // Comment button
      if (e.target.closest('.comment-btn')) {
        const postId = e.target.closest('.comment-btn').dataset.postId;
        this.toggleComments(postId);
      }

      // Save button
      if (e.target.closest('.save-btn')) {
        const postId = e.target.closest('.save-btn').dataset.postId;
        await this.toggleSave(postId, e.target.closest('.save-btn'));
      }

      // Add comment button
      if (e.target.closest('.add-comment-btn')) {
        const postId = e.target.closest('.add-comment-btn').dataset.postId;
        await this.addComment(postId);
      }

      // Delete post button
      if (e.target.closest('.delete-post-btn')) {
        const postId = e.target.closest('.delete-post-btn').dataset.postId;
        await this.deletePost(postId);
      }

      // Delete comment button
      if (e.target.closest('.delete-comment-btn')) {
        e.preventDefault();
        const commentId = e.target.closest('.delete-comment-btn').dataset.commentId;
        const postId = e.target.closest('.delete-comment-btn').dataset.postId;
        await this.deleteComment(commentId, postId);
      }
    });

    // Enter key for comments
    document.addEventListener('keypress', async (e) => {
      if (e.target.id && e.target.id.startsWith('comment-input-')) {
        if (e.key === 'Enter') {
          const postId = e.target.id.replace('comment-input-', '');
          await this.addComment(postId);
        }
      }
    });
  }

  async createPost() {
    const postInput = document.getElementById('post');
    if (!postInput) return;

    const textContent = postInput.value.trim();
    
    if (!textContent) {
      UIManager.showToast('Please enter some text', 'error');
      return;
    }

    // Disable input during creation
    postInput.disabled = true;
    const postButton = document.getElementById('post-button');
    if (postButton) {
      postButton.disabled = true;
      postButton.textContent = 'Posting...';
    }

    const result = await postManager.createPost(textContent);

    if (result.success) {
      postInput.value = '';
      UIManager.showToast('Post created successfully!', 'success');
    } else {
      UIManager.showToast('Failed to create post', 'error');
    }

    // Re-enable input
    postInput.disabled = false;
    if (postButton) {
      postButton.disabled = false;
      postButton.textContent = 'Post';
    }
  }

  async toggleLike(postId, button) {
    const result = await likesManager.toggleLike(postId);
    
    if (result.success) {
      const isLiked = await likesManager.isPostLikedByUser(postId);
      const icon = button.querySelector('i');
      
      if (isLiked) {
        button.classList.add('liked');
        icon.className = 'bi bi-heart-fill';
      } else {
        button.classList.remove('liked');
        icon.className = 'bi bi-heart';
      }

      // Update likes count
      const postCard = button.closest('.post-card');
      const likesCount = postCard.querySelector('.post-stats span:first-child');
      if (likesCount) {
        likesCount.innerHTML = `<i class="bi bi-heart-fill text-danger"></i> ${result.likesCount || 0}`;
      }
    }
  }

  async toggleSave(postId, button) {
    const result = await savedPostsManager.toggleSave(postId);
    
    if (result.success) {
      const isSaved = await savedPostsManager.isPostSaved(postId);
      const icon = button.querySelector('i');
      
      if (isSaved) {
        button.classList.add('saved');
        icon.className = 'bi bi-bookmark-fill';
        UIManager.showToast('Post saved', 'success');
      } else {
        button.classList.remove('saved');
        icon.className = 'bi bi-bookmark';
        UIManager.showToast('Post unsaved', 'success');
      }
    }
  }

  toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (!commentsSection) return;

    const isVisible = commentsSection.style.display !== 'none';
    
    if (isVisible) {
      commentsSection.style.display = 'none';
      commentsManager.stopListeningToPost(postId);
    } else {
      commentsSection.style.display = 'block';
      this.loadComments(postId);
    }
  }

  async loadComments(postId) {
    const commentsList = document.getElementById(`comments-list-${postId}`);
    if (!commentsList) return;

    // Listen to comments in real-time
    commentsManager.listenToPostComments(postId, (comments) => {
      if (comments.length === 0) {
        commentsList.innerHTML = '<p class="text-muted text-center">No comments yet</p>';
        return;
      }

      const commentsHTML = comments.map(comment => 
        UIManager.createCommentHTML(comment)
      ).join('');

      commentsList.innerHTML = commentsHTML;
    });
  }

  async addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;

    const commentText = input.value.trim();
    
    if (!commentText) {
      UIManager.showToast('Please enter a comment', 'error');
      return;
    }

    input.disabled = true;

    const result = await commentsManager.addComment(postId, commentText);

    if (result.success) {
      input.value = '';
      // Comments will update automatically via listener
    } else {
      UIManager.showToast('Failed to add comment', 'error');
    }

    input.disabled = false;
    input.focus();
  }

  async deletePost(postId) {
    const confirmed = await UIManager.confirm('Are you sure you want to delete this post?');
    
    if (!confirmed) return;

    const result = await postManager.deletePost(postId);
    
    if (result.success) {
      UIManager.showToast('Post deleted successfully', 'success');
    } else {
      UIManager.showToast('Failed to delete post', 'error');
    }
  }

  async deleteComment(commentId, postId) {
    const confirmed = await UIManager.confirm('Are you sure you want to delete this comment?');
    
    if (!confirmed) return;

    const result = await commentsManager.deleteComment(commentId, postId);
    
    if (result.success) {
      UIManager.showToast('Comment deleted', 'success');
    } else {
      UIManager.showToast('Failed to delete comment', 'error');
    }
  }

  searchPosts(searchTerm) {
    const allPosts = document.querySelectorAll('.post-card');
    const term = searchTerm.toLowerCase();

    allPosts.forEach(post => {
      const content = post.querySelector('.post-content').textContent.toLowerCase();
      const userName = post.querySelector('h6').textContent.toLowerCase();
      
      if (content.includes(term) || userName.includes(term)) {
        post.style.display = 'block';
      } else {
        post.style.display = 'none';
      }
    });
  }

  cleanup() {
    if (this.postsUnsubscribe) {
      this.postsUnsubscribe();
    }
    commentsManager.clearAllListeners();
  }
}

// Initialize dashboard
const dashboard = new Dashboard();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  dashboard.cleanup();
});