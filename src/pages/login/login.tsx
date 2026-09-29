import './login.css'
export default function Login() {
    return(
        <div className="login-container">
            <form id="loginForm">
                <h1> Sign In</h1>
                <label htmlFor="email"> Email</label>
                <input type="email" id="email" name="email" required/>

                <label htmlFor="password"> Password</label>
                <input type="password" id="password" name="password" required/>

                <button type="submit"> Sign In</button>

                <p id="errorMsg" className="error"></p>
            </form>
        </div>
    )
}