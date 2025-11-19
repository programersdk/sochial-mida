// ==================== COMMENTS MANAGER ====================
import firebaseApp, { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  getDoc,
  serverTimestamp,
  onSnapshot
} from '../config/config.js';
import postManager from './posts.js';

class CommentsManager {
  constructor() {
    this.comments = new Map(); // Cache comments by postId
    this.listeners = new Map(); // Track listeners
  }

  // Add a comment to a post
  async addComment(postId, commentText) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // Get user data
      const userData = await firebaseApp.getUserDocument(currentUser.uid);

      const commentId = `comment_${Date.now()}_${currentUser.uid}`;
      const commentRef = doc(firebaseApp.db, 'comments', commentId);

      const commentData = {
        commentId,
        postId,
        userId: currentUser.uid,
        userName: userData.displayName || 'Unknown User',
        commentText,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      await setDoc(commentRef, commentData);

      // Update post comments count
      const commentsCount = await this.getPostCommentsCount(postId);
      await postManager.updatePostCounts(postId, { commentsCount });

      return { success: true, commentId, commentData };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: error.message };
    }
  }

  // Get comments for a post
  async getPostComments(postId) {
    try {
      const commentsQuery = query(
        collection(firebaseApp.db, 'comments'),
        where('postId', '==', postId),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(commentsQuery);
      const comments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update cache
      this.comments.set(postId, comments);

      return comments;
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }

  // Listen to comments in real-time
  listenToPostComments(postId, callback) {
    const commentsQuery = query(
      collection(firebaseApp.db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.comments.set(postId, comments);
      callback(comments);
    }, (error) => {
      console.error('Error listening to comments:', error);
    });

    // Store listener
    this.listeners.set(postId, unsubscribe);

    return unsubscribe;
  }

  // Stop listening to comments
  stopListeningToPost(postId) {
    const unsubscribe = this.listeners.get(postId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(postId);
    }
  }

  // Get comments count for a post
  async getPostCommentsCount(postId) {
    try {
      const commentsQuery = query(
        collection(firebaseApp.db, 'comments'),
        where('postId', '==', postId)
      );

      const querySnapshot = await getDocs(commentsQuery);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting comments count:', error);
      return 0;
    }
  }

  // Delete a comment
  async deleteComment(commentId, postId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // Verify ownership
      const commentRef = doc(firebaseApp.db, 'comments', commentId);
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      if (commentSnap.data().userId !== currentUser.uid) {
        throw new Error('Unauthorized to delete this comment');
      }

      await deleteDoc(commentRef);

      // Update post comments count
      const commentsCount = await this.getPostCommentsCount(postId);
      await postManager.updatePostCounts(postId, { commentsCount });

      return { success: true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return { success: false, error: error.message };
    }
  }

  // Get cached comments
  getCachedComments(postId) {
    return this.comments.get(postId) || [];
  }

  // Clear cache
  clearCache() {
    this.comments.clear();
  }

  // Clear all listeners
  clearAllListeners() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

// Create singleton instance
const commentsManager = new CommentsManager();

export default commentsManager;
