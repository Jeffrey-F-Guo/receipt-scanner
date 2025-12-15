function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <h2>Lamp</h2>
                </div>
                <ul className="navbar-menu">
                    <li><a href="/">Home</a></li>
                    <li><a href="/scan">Scan</a></li>
                    <li><a href="/history">History</a></li>
                </ul>
            </div>
        </nav>
    )
}

export default Navbar
