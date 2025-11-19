// ==================== SAVED POSTS PAGE ====================
import firebaseApp from './config/config.js';
import authManager from './js/auth.js';
import savedPostsManager from './js/saved.js';
import likesManager from './js/likes.js';
import commentsManager from './js/comments.js';
import UIManager from './js/ui.js';

class SavedPostsPage {
  constructor() {
    this.init();
  }

  async init() {
    authManager.onAuthStateChange(async (user) => {
      if (user) {
        await this.loadUserProfile();
        await this.loadSavedPosts();
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

  async loadSavedPosts() {
    const container = document.getElementById('savedPostsContainer');
    const savedCount = document.getElementById('savedCount');
    
    if (!container) return;

    const loader = UIManager.showLoading(container);

    try {
      const savedPosts = await savedPostsManager.getSavedPosts();

      UIManager.hideLoading(loader);

      if (savedCount) {
        savedCount.textContent = `${savedPosts.length} ${savedPosts.length === 1 ? 'post' : 'posts'}`;
      }

      if (savedPosts.length === 0) {
        UIManager.showEmptyState(
          container,
          'bookmark',
          'No saved posts',
          'Posts you save will appear here'
        );
        return;
      }

      await this.renderSavedPosts(savedPosts);
    } catch (error) {
      UIManager.hideLoading(loader);
      UIManager.showToast('Failed to load saved posts', 'error');
      console.error('Error loading saved posts:', error);
    }
  }

  async renderSavedPosts(posts) {
    const container = document.getElementById('savedPostsContainer');
    if (!container) return;

    const postsHTML = await Promise.all(posts.map(async (post) => {
      const isLiked = await likesManager.isPostLikedByUser(post.postId);
      const isSaved = true; // Always true on this page
      const commentsCount = await commentsManager.getPostCommentsCount(post.postId);
      
      return UIManager.createPostCard(post, isLiked, isSaved, commentsCount);
    }));

    container.innerHTML = postsHTML.join('');
  }

  setupEventListeners() {
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

      // Save/Unsave button
      if (e.target.closest('.save-btn')) {
        const postId = e.target.closest('.save-btn').dataset.postId;
        await this.unsavePost(postId);
      }

      // Add comment button
      if (e.target.closest('.add-comment-btn')) {
        const postId = e.target.closest('.add-comment-btn').dataset.postId;
        await this.addComment(postId);
      }
    });
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

      const postCard = button.closest('.post-card');
      const likesCount = postCard.querySelector('.post-stats span:first-child');
      if (likesCount) {
        likesCount.innerHTML = `<i class="bi bi-heart-fill text-danger"></i> ${result.likesCount || 0}`;
      }
    }
  }

  async unsavePost(postId) {
    const result = await savedPostsManager.unsavePost(postId);
    
    if (result.success) {
      UIManager.showToast('Post removed from saved', 'success');
      
      // Remove post card from UI
      const postCard = document.querySelector(`[data-post-id="${postId}"]`);
      if (postCard) {
        postCard.style.opacity = '0';
        setTimeout(() => {
          postCard.remove();
          this.updateSavedCount();
          
          // Check if no posts left
          const container = document.getElementById('savedPostsContainer');
          if (container && container.children.length === 0) {
            UIManager.showEmptyState(
              container,
              'bookmark',
              'No saved posts',
              'Posts you save will appear here'
            );
          }
        }, 300);
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
    } else {
      UIManager.showToast('Failed to add comment', 'error');
    }

    input.disabled = false;
  }

  async updateSavedCount() {
    const savedCount = document.getElementById('savedCount');
    if (savedCount) {
      const count = await savedPostsManager.getSavedPostsCount();
      savedCount.textContent = `${count} ${count === 1 ? 'post' : 'posts'}`;
    }
  }
}

// Initialize page
new SavedPostsPage();
