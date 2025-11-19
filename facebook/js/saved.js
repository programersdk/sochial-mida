// ==================== SAVED POSTS MANAGER ====================
import firebaseApp, { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  getDoc,
  serverTimestamp,
  orderBy
} from '../config/config.js';

class SavedPostsManager {
  constructor() {
    this.savedPosts = [];
    this.savedPostIds = new Set();
  }

  // Save a post
  async savePost(postId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const savedId = `${currentUser.uid}_${postId}`;
      const savedRef = doc(firebaseApp.db, 'saved_posts', savedId);

      // Check if already saved
      const savedSnap = await getDoc(savedRef);
      if (savedSnap.exists()) {
        return { success: false, error: 'Post already saved' };
      }

      const savedData = {
        userId: currentUser.uid,
        postId,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      await setDoc(savedRef, savedData);

      // Update cache
      this.savedPostIds.add(postId);

      return { success: true };
    } catch (error) {
      console.error('Error saving post:', error);
      return { success: false, error: error.message };
    }
  }

  // Unsave a post
  async unsavePost(postId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const savedId = `${currentUser.uid}_${postId}`;
      const savedRef = doc(firebaseApp.db, 'saved_posts', savedId);

      await deleteDoc(savedRef);

      // Update cache
      this.savedPostIds.delete(postId);

      return { success: true };
    } catch (error) {
      console.error('Error unsaving post:', error);
      return { success: false, error: error.message };
    }
  }

  // Toggle save status
  async toggleSave(postId) {
    const isSaved = await this.isPostSaved(postId);
    
    if (isSaved) {
      return await this.unsavePost(postId);
    } else {
      return await this.savePost(postId);
    }
  }

  // Check if post is saved
  async isPostSaved(postId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) return false;

      // Check cache first
      if (this.savedPostIds.has(postId)) {
        return true;
      }

      const savedId = `${currentUser.uid}_${postId}`;
      const savedRef = doc(firebaseApp.db, 'saved_posts', savedId);
      const savedSnap = await getDoc(savedRef);

      const isSaved = savedSnap.exists();
      
      if (isSaved) {
        this.savedPostIds.add(postId);
      }

      return isSaved;
    } catch (error) {
      console.error('Error checking save status:', error);
      return false;
    }
  }

  // Get all saved posts
  async getSavedPosts() {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const savedQuery = query(
        collection(firebaseApp.db, 'saved_posts'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(savedQuery);
      const savedPostIds = querySnapshot.docs.map(doc => doc.data().postId);

      // Update cache
      this.savedPostIds = new Set(savedPostIds);

      // Get actual post data
      const posts = [];
      for (const postId of savedPostIds) {
        try {
          const postRef = doc(firebaseApp.db, 'posts', postId);
          const postSnap = await getDoc(postRef);
          
          if (postSnap.exists()) {
            posts.push({
              id: postSnap.id,
              ...postSnap.data()
            });
          }
        } catch (error) {
          console.error(`Error getting post ${postId}:`, error);
        }
      }

      this.savedPosts = posts;
      return posts;
    } catch (error) {
      console.error('Error getting saved posts:', error);
      return [];
    }
  }

  // Load saved status for multiple posts
  async loadSavedStatusForPosts(postIds) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) return;

      for (const postId of postIds) {
        await this.isPostSaved(postId);
      }
    } catch (error) {
      console.error('Error loading saved status:', error);
    }
  }

  // Get saved posts count
  async getSavedPostsCount() {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) return 0;

      const savedQuery = query(
        collection(firebaseApp.db, 'saved_posts'),
        where('userId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(savedQuery);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting saved posts count:', error);
      return 0;
    }
  }

  // Clear cache
  clearCache() {
    this.savedPosts = [];
    this.savedPostIds.clear();
  }
}

// Create singleton instance
const savedPostsManager = new SavedPostsManager();

export default savedPostsManager;
