// ==================== LOGIN/SIGNUP PAGE ====================
import authManager from './js/auth.js';
import UIManager from './js/ui.js';
import { validateEmail } from './js/helpers.js';

// Toggle password visibility
const togglePwd = document.getElementById('togglePwd');
if (togglePwd) {
  togglePwd.addEventListener('change', function() {
    const loginPwd = document.getElementById('loginPassword');
    const signupPwd = document.getElementById('password');
    const confirmPwd = document.getElementById('confirm_password');
    
    const type = this.checked ? 'text' : 'password';
    if (loginPwd) loginPwd.type = type;
    if (signupPwd) signupPwd.type = type;
    if (confirmPwd) confirmPwd.type = type;
  });
}

// Navigate to signup
window.goToSignUp = () => {
  document.getElementById('login').style.display = 'none';
  const logo = document.getElementById('logo-section');
  if (logo) logo.style.display = 'none';
  document.getElementById('SignUp').style.display = 'block';
};

// Navigate to login
window.goToLogIn = () => {
  document.getElementById('login').style.display = 'block';
  const logo = document.getElementById('logo-section');
  if (logo) logo.style.display = 'block';
  document.getElementById('SignUp').style.display = 'none';
};

// Sign up function
window.signUp = async (event) => {
  event.preventDefault();
  
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm_password').value;
  const gender = document.getElementById('Gender').value;
  const dob = `${document.getElementById('dob-year').value}-${document.getElementById('dob-month').value}-${document.getElementById('dob-day').value}`;

  // Validation
  if (!firstName || !lastName) {
    UIManager.showToast('Please enter your full name', 'error');
    return;
  }

  if (!validateEmail(email)) {
    UIManager.showToast('Please enter a valid email address', 'error');
    return;
  }

  if (password.length < 6) {
    UIManager.showToast('Password must be at least 6 characters', 'error');
    return;
  }

  if (password !== confirmPassword) {
    UIManager.showToast('Passwords do not match', 'error');
    return;
  }

  if (!gender) {
    UIManager.showToast('Please select your gender', 'error');
    return;
  }

  if (!document.getElementById('dob-day').value || !document.getElementById('dob-month').value || !document.getElementById('dob-year').value) {
    UIManager.showToast('Please select your date of birth', 'error');
    return;
  }

  // Disable button during signup
  const signupBtn = event.target;
  signupBtn.disabled = true;
  signupBtn.textContent = 'Signing up...';

  try {
    const result = await authManager.signUp(email, password, firstName, lastName, dob, gender);
    
    if (result.success) {
      UIManager.showToast('Account created successfully!', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      UIManager.showToast(result.error, 'error');
      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign Up';
    }
  } catch (error) {
    UIManager.showToast('An error occurred. Please try again', 'error');
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
  }
};

// Login function
window.login = async (event) => {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  // Validation
  if (!validateEmail(email)) {
    UIManager.showToast('Please enter a valid email address', 'error');
    return;
  }

  if (!password) {
    UIManager.showToast('Please enter your password', 'error');
    return;
  }

  // Disable button during login
  const loginBtn = event.target;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  try {
    const result = await authManager.signIn(email, password);
    
    if (result.success) {
      UIManager.showToast('Login successful!', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      UIManager.showToast(result.error, 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
    }
  } catch (error) {
    UIManager.showToast('An error occurred. Please try again', 'error');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
  }
};

// Check if user is already logged in
// authManager.onAuthStateChange((user) => {
//   if (user) {
//     window.location.href = 'dashboard.html';
//   }
// });
