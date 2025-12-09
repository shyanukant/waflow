import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
    const [isVisible, setIsVisible] = useState(false);
    const [activeFeature, setActiveFeature] = useState(0);

    useEffect(() => {
        setIsVisible(true);

        // Auto-rotate features
        const interval = setInterval(() => {
            setActiveFeature(prev => (prev + 1) % 4);
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    const features = [
        {
            icon: '🤖',
            title: 'AI-Powered Agents',
            description: 'Create intelligent WhatsApp agents that understand your business and respond naturally to customers 24/7.'
        },
        {
            icon: '📚',
            title: 'Knowledge Base',
            description: 'Upload documents, URLs, and files. Your AI learns your products, services, and FAQs instantly.'
        },
        {
            icon: '📊',
            title: 'Lead Capture',
            description: 'Automatically capture and organize leads from conversations. Never miss a potential customer.'
        },
        {
            icon: '⚡',
            title: 'Instant Setup',
            description: 'Connect your WhatsApp, upload knowledge, and launch your AI agent in under 5 minutes.'
        }
    ];

    const stats = [
        { value: '24/7', label: 'Availability' },
        { value: '< 5s', label: 'Response Time' },
        { value: '100%', label: 'Lead Capture' },
        { value: '∞', label: 'Conversations' }
    ];

    return (
        <div className="landing">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="nav-container">
                    <div className="nav-logo">
                        <span className="logo-icon">💬</span>
                        <span className="logo-text">WAFlow</span>
                    </div>
                    <div className="nav-links">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                        <a href="#pricing">Pricing</a>
                    </div>
                    <div className="nav-actions">
                        <Link to="/login" className="btn-nav-login">Login</Link>
                        <Link to="/register" className="btn-nav-signup">Get Started Free</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={`hero ${isVisible ? 'visible' : ''}`}>
                <div className="hero-bg">
                    <div className="hero-gradient"></div>
                    <div className="hero-particles">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="particle" style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${10 + Math.random() * 20}s`
                            }}></div>
                        ))}
                    </div>
                </div>

                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-dot"></span>
                        AI-Powered WhatsApp Automation
                    </div>

                    <h1 className="hero-title">
                        Turn Your WhatsApp Into a
                        <span className="gradient-text"> 24/7 Sales Machine</span>
                    </h1>

                    <p className="hero-subtitle">
                        Create intelligent AI agents that handle customer queries, capture leads,
                        and close sales on WhatsApp — while you sleep.
                    </p>

                    <div className="hero-cta">
                        <Link to="/register" className="btn-primary-large">
                            Start Free Trial
                            <span className="btn-arrow">→</span>
                        </Link>
                        <a href="#how-it-works" className="btn-secondary-large">
                            <span className="play-icon">▶</span>
                            Watch Demo
                        </a>
                    </div>

                    <div className="hero-trust">
                        <p>Trusted by 500+ businesses</p>
                        <div className="trust-avatars">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="trust-avatar" style={{
                                    background: `hsl(${120 + i * 20}, 60%, 40%)`
                                }}>
                                    {String.fromCharCode(65 + i)}
                                </div>
                            ))}
                            <span>+495</span>
                        </div>
                    </div>
                </div>

                {/* Hero Visual */}
                <div className="hero-visual">
                    <div className="phone-mockup">
                        <div className="phone-screen">
                            <div className="wa-header">
                                <span>💬</span> WAFlow Agent
                            </div>
                            <div className="wa-chat">
                                <div className="wa-message incoming">
                                    <p>Hi! I'm interested in your services. What do you offer?</p>
                                    <span className="time">10:30 AM</span>
                                </div>
                                <div className="wa-message outgoing">
                                    <p>Hello! 👋 I'm here to help! We offer AI automation solutions for businesses. What specific area are you looking to automate?</p>
                                    <span className="time">10:30 AM ✓✓</span>
                                </div>
                                <div className="wa-message incoming">
                                    <p>Customer support automation</p>
                                    <span className="time">10:31 AM</span>
                                </div>
                                <div className="wa-message outgoing typing">
                                    <div className="typing-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="floating-card card-1">
                        <span>🎯</span> Lead Captured!
                    </div>
                    <div className="floating-card card-2">
                        <span>📈</span> +23% Conversion
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="stats-bar">
                <div className="stats-container">
                    {stats.map((stat, i) => (
                        <div key={i} className="stat-item">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features">
                <div className="section-container">
                    <div className="section-header">
                        <span className="section-tag">Features</span>
                        <h2>Everything You Need to <span className="gradient-text">Automate Sales</span></h2>
                        <p>Powerful features designed to convert WhatsApp conversations into customers.</p>
                    </div>

                    <div className="features-grid">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className={`feature-card ${activeFeature === i ? 'active' : ''}`}
                                onMouseEnter={() => setActiveFeature(i)}
                            >
                                <div className="feature-icon">{feature.icon}</div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                                <div className="feature-glow"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="how-it-works">
                <div className="section-container">
                    <div className="section-header">
                        <span className="section-tag">How It Works</span>
                        <h2>Launch Your AI Agent in <span className="gradient-text">3 Simple Steps</span></h2>
                    </div>

                    <div className="steps">
                        <div className="step">
                            <div className="step-number">1</div>
                            <div className="step-icon">📱</div>
                            <div className="step-content">
                                <h3>Connect WhatsApp</h3>
                                <p>Scan QR code to link your WhatsApp Business account. Takes just 30 seconds.</p>
                            </div>
                        </div>

                        <div className="step">
                            <div className="step-number">2</div>
                            <div className="step-icon">🧠</div>
                            <div className="step-content">
                                <h3>Train Your Agent</h3>
                                <p>Upload documents, paste URLs, or type knowledge. AI learns your business instantly.</p>
                            </div>
                        </div>

                        <div className="step">
                            <div className="step-number">3</div>
                            <div className="step-icon">🚀</div>
                            <div className="step-content">
                                <h3>Go Live</h3>
                                <p>Activate your agent and start handling customer conversations automatically.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="pricing">
                <div className="section-container">
                    <div className="section-header">
                        <span className="section-tag">Pricing</span>
                        <h2>Simple, <span className="gradient-text">Transparent Pricing</span></h2>
                        <p>Start free, scale as you grow.</p>
                    </div>

                    <div className="pricing-cards">
                        <div className="pricing-card">
                            <div className="pricing-header">
                                <h3>Starter</h3>
                                <div className="price">
                                    <span className="currency">₹</span>
                                    <span className="amount">0</span>
                                    <span className="period">/month</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>✓ 1 WhatsApp Number</li>
                                <li>✓ 100 Messages/month</li>
                                <li>✓ 3 Knowledge Documents</li>
                                <li>✓ Basic Analytics</li>
                                <li>✓ Email Support</li>
                            </ul>
                            <Link to="/register" className="btn-pricing">Start Free</Link>
                        </div>

                        <div className="pricing-card featured">
                            <div className="featured-badge">Most Popular</div>
                            <div className="pricing-header">
                                <h3>Pro</h3>
                                <div className="price">
                                    <span className="currency">₹</span>
                                    <span className="amount">1,999</span>
                                    <span className="period">/month</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>✓ 3 WhatsApp Numbers</li>
                                <li>✓ Unlimited Messages</li>
                                <li>✓ Unlimited Knowledge</li>
                                <li>✓ Advanced Analytics</li>
                                <li>✓ Lead Export</li>
                                <li>✓ Priority Support</li>
                            </ul>
                            <Link to="/register" className="btn-pricing-featured">Get Pro</Link>
                        </div>

                        <div className="pricing-card">
                            <div className="pricing-header">
                                <h3>Enterprise</h3>
                                <div className="price">
                                    <span className="amount">Custom</span>
                                </div>
                            </div>
                            <ul className="pricing-features">
                                <li>✓ Unlimited Numbers</li>
                                <li>✓ Custom Integrations</li>
                                <li>✓ Dedicated Account Manager</li>
                                <li>✓ SLA Guarantee</li>
                                <li>✓ On-premise Option</li>
                            </ul>
                            <a href="mailto:contact@waflow.io" className="btn-pricing">Contact Sales</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-container">
                    <div className="cta-bg"></div>
                    <div className="cta-content">
                        <h2>Ready to Automate Your WhatsApp?</h2>
                        <p>Join 500+ businesses already using WAFlow to grow sales on autopilot.</p>
                        <Link to="/register" className="btn-cta">
                            Get Started Free
                            <span className="btn-arrow">→</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-container">
                    <div className="footer-brand">
                        <div className="nav-logo">
                            <span className="logo-icon">💬</span>
                            <span className="logo-text">WAFlow</span>
                        </div>
                        <p>AI-powered WhatsApp automation for modern businesses.</p>
                    </div>

                    <div className="footer-links">
                        <div className="footer-col">
                            <h4>Product</h4>
                            <a href="#features">Features</a>
                            <a href="#pricing">Pricing</a>
                            <a href="#how-it-works">How It Works</a>
                        </div>
                        <div className="footer-col">
                            <h4>Company</h4>
                            <a href="https://krtrim.tech" target="_blank" rel="noopener noreferrer">About Us</a>
                            <a href="mailto:contact@krtrim.tech">Contact</a>
                        </div>
                        <div className="footer-col">
                            <h4>Legal</h4>
                            <a href="#">Privacy Policy</a>
                            <a href="#">Terms of Service</a>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2024 WAFlow by <a href="https://krtrim.tech" target="_blank" rel="noopener noreferrer">krtrim</a>. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

export default Landing;
