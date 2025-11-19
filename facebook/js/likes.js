// ==================== LIKES MANAGER ====================
import firebaseApp, { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  getDoc,
  serverTimestamp
} from '../config/config.js';
import postManager from './posts.js';

class LikesManager {
  constructor() {
    this.userLikes = new Map(); // Cache user likes
  }

  // Like a post
  async likePost(postId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const likeId = `${postId}_${currentUser.uid}`;
      const likeRef = doc(firebaseApp.db, 'likes', likeId);

      // Check if already liked
      const likeSnap = await getDoc(likeRef);
      if (likeSnap.exists()) {
        return { success: false, error: 'Already liked' };
      }

      const likeData = {
        postId,
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      await setDoc(likeRef, likeData);

      // Update post likes count
      const likesCount = await this.getPostLikesCount(postId);
      await postManager.updatePostCounts(postId, { likesCount });

      // Update cache
      this.userLikes.set(postId, true);

      return { success: true, likesCount };
    } catch (error) {
      console.error('Error liking post:', error);
      return { success: false, error: error.message };
    }
  }

  // Unlike a post
  async unlikePost(postId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const likeId = `${postId}_${currentUser.uid}`;
      const likeRef = doc(firebaseApp.db, 'likes', likeId);

      await deleteDoc(likeRef);

      // Update post likes count
      const likesCount = await this.getPostLikesCount(postId);
      await postManager.updatePostCounts(postId, { likesCount });

      // Update cache
      this.userLikes.set(postId, false);

      return { success: true, likesCount };
    } catch (error) {
      console.error('Error unliking post:', error);
      return { success: false, error: error.message };
    }
  }

  // Toggle like
  async toggleLike(postId) {
    const isLiked = await this.isPostLikedByUser(postId);
    
    if (isLiked) {
      return await this.unlikePost(postId);
    } else {
      return await this.likePost(postId);
    }
  }

  // Check if user has liked a post
  async isPostLikedByUser(postId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) return false;

      // Check cache first
      if (this.userLikes.has(postId)) {
        return this.userLikes.get(postId);
      }

      const likeId = `${postId}_${currentUser.uid}`;
      const likeRef = doc(firebaseApp.db, 'likes', likeId);
      const likeSnap = await getDoc(likeRef);

      const isLiked = likeSnap.exists();
      this.userLikes.set(postId, isLiked);

      return isLiked;
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  }

  // Get post likes count
  async getPostLikesCount(postId) {
    try {
      const likesQuery = query(
        collection(firebaseApp.db, 'likes'),
        where('postId', '==', postId)
      );

      const querySnapshot = await getDocs(likesQuery);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting likes count:', error);
      return 0;
    }
  }

  // Get all users who liked a post
  async getPostLikes(postId) {
    try {
      const likesQuery = query(
        collection(firebaseApp.db, 'likes'),
        where('postId', '==', postId)
      );

      const querySnapshot = await getDocs(likesQuery);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting post likes:', error);
      return [];
    }
  }

  // Load user likes for multiple posts
  async loadUserLikesForPosts(postIds) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) return;

      for (const postId of postIds) {
        await this.isPostLikedByUser(postId);
      }
    } catch (error) {
      console.error('Error loading user likes:', error);
    }
  }

  // Clear cache
  clearCache() {
    this.userLikes.clear();
  }
}

// Create singleton instance
const likesManager = new LikesManager();

export default likesManager;
