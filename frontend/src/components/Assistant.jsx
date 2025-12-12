import { useState, useRef, useEffect } from 'react'
import { FiMessageSquare, FiX, FiSend } from 'react-icons/fi'
import logo from '../assets/laranja.png'
import { assistantAPI } from '../services/api'
import './Assistant.css'

const Assistant = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: 'Olá! 👋 Sou o assistente inteligente da Txintxa. Posso ajudar com taxas, prazos, limites e dúvidas sobre câmbio. Como posso ser útil?',
            time: new Date()
        }
    ])
    const [inputText, setInputText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    const handleSend = async () => {
        if (!inputText.trim()) return

        const userMsg = { type: 'user', text: inputText, time: new Date() }
        setMessages(prev => [...prev, userMsg])
        setInputText('')
        setIsTyping(true)

        try {
            const response = await assistantAPI.chat(userMsg.text)
            const botMsg = { type: 'bot', text: response.data.reply, time: new Date() }
            setMessages(prev => [...prev, botMsg])
        } catch (error) {
            console.error(error)
            const errorMsg = { type: 'bot', text: 'Ops, minha conexão falhou. Tente novamente em instantes.', time: new Date() }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsTyping(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSend()
    }

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <>
            {/* Floating Button */}
            <button
                className={`assistant-trigger ${isOpen ? 'hidden' : ''}`}
                onClick={() => setIsOpen(true)}
                aria-label="Assistente Txintxa"
            >
                <div className="assistant-avatar">
                    <img src={logo} alt="Txintxa Assistant" style={{ objectFit: 'contain', padding: '2px' }} />
                    <span className="online-badge"></span>
                </div>
            </button>

            {/* Chat Window */}
            <div className={`assistant-window ${isOpen ? 'open' : ''}`}>
                <div className="assistant-header">
                    <div className="header-info">
                        <div className="header-avatar">
                            <img src={logo} alt="Bot" style={{ objectFit: 'contain' }} />
                            <span className="online-badge"></span>
                        </div>
                        <div>
                            <h3>Suporte Txintxa</h3>
                            <span className="status-text">IA Online</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={() => setIsOpen(false)}>
                        <FiX />
                    </button>
                </div>

                <div className="assistant-body">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.type} fade-in`}>
                            <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}></p>
                            <span className="msg-time">{formatTime(msg.time)}</span>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="message bot typing">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="assistant-footer">
                    <input
                        type="text"
                        placeholder="Digite sua dúvida..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isTyping}
                    />
                    <button className="send-btn" onClick={handleSend} disabled={!inputText.trim() || isTyping}>
                        <FiSend />
                    </button>
                </div>
            </div>
        </>
    )
}

export default Assistant
