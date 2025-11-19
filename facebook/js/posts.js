// ==================== POST MANAGER ====================
import firebaseApp, { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  updateDoc,
  getDoc
} from '../config/config.js';

class PostManager {
  constructor() {
    this.posts = [];
    this.listeners = [];
    this.unsubscribe = null;
  }

  // Create a new post
  async createPost(textContent) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // Get user data
      const userData = await firebaseApp.getUserDocument(currentUser.uid);

      const postId = `post_${Date.now()}_${currentUser.uid}`;
      const postRef = doc(firebaseApp.db, 'posts', postId);

      const postData = {
        postId,
        userId: currentUser.uid,
        userName: userData.displayName || 'Unknown User',
        userEmail: currentUser.email,
        textContent,
        timestamp: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString()
      };

      await setDoc(postRef, postData);

      return { success: true, postId };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all posts
  async getAllPosts() {
    try {
      const postsQuery = query(
        collection(firebaseApp.db, 'posts'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(postsQuery);
      this.posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return this.posts;
    } catch (error) {
      console.error('Error getting posts:', error);
      return [];
    }
  }

  // Listen to posts in real-time
  listenToPosts(callback) {
    const postsQuery = query(
      collection(firebaseApp.db, 'posts'),
      orderBy('createdAt', 'desc')
    );

    this.unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      this.posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      callback(this.posts);
    }, (error) => {
      console.error('Error listening to posts:', error);
    });

    return this.unsubscribe;
  }

  // Stop listening to posts
  stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // Delete a post
  async deletePost(postId) {
    try {
      const currentUser = firebaseApp.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      // Verify ownership
      const postRef = doc(firebaseApp.db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }

      if (postSnap.data().userId !== currentUser.uid) {
        throw new Error('Unauthorized to delete this post');
      }

      await deleteDoc(postRef);

      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: error.message };
    }
  }

  // Update post counts
  async updatePostCounts(postId, updates) {
    try {
      const postRef = doc(firebaseApp.db, 'posts', postId);
      await updateDoc(postRef, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating post counts:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's posts
  async getUserPosts(userId) {
    try {
      const querySnapshot = await getDocs(
        collection(firebaseApp.db, 'posts')
      );

      const userPosts = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post => post.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return userPosts;
    } catch (error) {
      console.error('Error getting user posts:', error);
      return [];
    }
  }
}

// Create singleton instance
const postManager = new PostManager();

export default postManager;
