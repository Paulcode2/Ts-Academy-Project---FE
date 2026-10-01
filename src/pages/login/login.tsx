import React, { useState } from 'react'
import './login.css'
export default function Login() {
        const [isSignUp, setIsSignUp] = useState(false)
        const [password, setPassword] = useState('')
        const [confirmPassword, setConfirmPassword] = useState('')
        const [errorMsg, setErrorMsg] = useState('')
        const [email, setEmail] = useState('')
        const [signInPassword,setSignInPassword] = useState('')
        const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            if (!isSignUp) {
                localStorage.setItem('isAuthenticated', 'true')
                window.location.href = '/dashboard'
            return
            }
            if (isSignUp) {
            if (password !== confirmPassword) {
                setErrorMsg('Passwords do not match')
                return
            }
            setErrorMsg('')
            //continue registration process//
            console.log('Registration successful')
            } else {
               setErrorMsg('')
               //continue login process//
               console.log('sign in attempt')
            }
        }   
    return(
        <div className="login-container">
            <form id="loginForm" onSubmit={handleSubmit}>
                                {/* Sign In / Sign Up switch */}
                <div className="auth-tabs">
                    <button
                        type="button"
                        className={!isSignUp ? 'active' : ''}
                        onClick={() => setIsSignUp(false)}
                    >
                        Sign In
                    </button>

                    <button
                        type="button"
                        className={isSignUp ? 'active' : ''}
                        onClick={() => setIsSignUp(true)}
                    >
                        Sign Up
                    </button>
                </div>

                {!isSignUp ? (
                    /* ================= SIGN IN ================= */
                    <>

                <h1> Sign In</h1>
                <label htmlFor="email"> Email</label>
                <input type="email" id="email" name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required/>

                <label htmlFor="password"> Password</label>
                <input type="password" id="password" name="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                required/>
                <p className="error">{errorMsg}</p>

                <button type="submit" className="submit-button">
                    Sign In
                </button>
            </>
                ) : (
                    /* ================= SIGN UP ================= */
                    <>
                        <h1>Create Account</h1>

                        <label htmlFor="fullName">Full Name</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            required
                        />

                        <label htmlFor="signupEmail">Email Address</label>
                        <input
                            type="email"
                            id="signupEmail"
                            name="signupEmail"
                            required
                        />

                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            required
                        />

                        <label htmlFor="signupPassword">Password</label>
                        <input
                            type="password"
                            id="signupPassword"
                            name="signupPassword"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}   
                            required
                        />

                        <label htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}    
                            required
                        />
                        <p className="error">{errorMsg}</p>

                        <label htmlFor="role">Position</label>
                        <select id="role" name="role" required>
                            <option value="">Position</option>

                            <option value="administrator">
                                Administrator
                            </option>

                            <option value="warehouse-manager">
                                Warehouse Manager
                            </option>

                            <option value="warehouse-staff">
                                Warehouse Staff
                            </option>
                        </select>

                        <button type="submit" className="submit-button">
                            Create Account
                        </button>
                    </>
                )}
            </form>
        </div>
    )
}