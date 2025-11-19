// ==================== AUTHENTICATION MANAGER ====================
import firebaseApp, { onAuthStateChanged } from '../config/config.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.init();
  }

  init() {
    onAuthStateChanged(firebaseApp.auth, async (user) => {
      this.currentUser = user;
      
      if (user) {
        try {
          // Update last login time
          await firebaseApp.updateUserDocument(user.uid, {
            lastLogin: new Date().toISOString()
          });
          
          // Notify all listeners
          this.notifyAuthStateChange(user);
        } catch (error) {
          console.error('Error updating user login:', error);
        }
      } else {
        this.notifyAuthStateChange(null);
      }
    });
  }

  // Add listener for auth state changes
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);
    
    // Call immediately with current state
    if (this.currentUser !== undefined) {
      callback(this.currentUser);
    }
  }

  // Notify all listeners
  notifyAuthStateChange(user) {
    this.authStateListeners.forEach(callback => callback(user));
  }

  // Sign up new user
  async signUp(email, password, firstName, lastName, dob, gender) {
    try {
      const displayName = `${firstName} ${lastName}`;
      
      const userCredential = await firebaseApp.createUser(email, password, {
        displayName,
        firstName,
        lastName,
        dob,
        gender,
        profileImage: '',
        friends: [],
        pendingRequests: [],
        sentRequests: []
      });

      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign in existing user
  async signIn(email, password) {
    try {
      const userCredential = await firebaseApp.signIn(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign out
  async signOut() {
    try {
      await firebaseApp.signOutUser();
      window.location.href = 'index.html';
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get user-friendly error messages
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later'
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again';
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Require authentication (redirect if not logged in)
  requireAuth() {
    if (!this.currentUser && this.currentUser !== undefined) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  // Get current user data
  async getCurrentUserData() {
    if (!this.currentUser) return null;
    
    try {
      return await firebaseApp.getUserDocument(this.currentUser.uid);
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }
}

// Create singleton instance
const authManager = new AuthManager();

export default authManager;
