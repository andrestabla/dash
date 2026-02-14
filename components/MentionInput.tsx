import React, { useState, useRef, useEffect } from 'react';

interface User {
    id: string;
    name: string;
    email?: string;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend?: () => void; // Triggered on Enter (without shift)
    placeholder?: string;
    users: User[];
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    minHeight?: number;
}

const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    onSend,
    placeholder,
    users,
    disabled,
    className,
    style,
    minHeight = 40
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState("");
    const [cursorIdx, setCursorIdx] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(suggestionQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(suggestionQuery.toLowerCase()))
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % filteredUsers.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (filteredUsers.length > 0) {
                    selectUser(filteredUsers[activeIndex]);
                } else {
                    setShowSuggestions(false);
                }
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else {
            if (e.key === 'Enter' && !e.shiftKey && onSend) {
                e.preventDefault();
                onSend();
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorIdx = e.target.selectionStart;
        onChange(newValue);
        setCursorIdx(newCursorIdx);

        // Detect mention trigger
        // Look backwards from cursor for @
        const textBeforeCursor = newValue.slice(0, newCursorIdx);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1) {
            // Check if it's a valid mention start (start of line or preceded by space)
            const isStart = lastAt === 0 || /\s/.test(textBeforeCursor[lastAt - 1]);
            if (isStart) {
                const query = textBeforeCursor.slice(lastAt + 1);
                // Only allow simple names, no spaces yet? Or allow spaces if enclosed?
                // For simplicity, stop at space or allow up to X chars
                if (!/\s/.test(query) || query.length < 20) {
                    setSuggestionQuery(query);
                    setShowSuggestions(true);
                    setActiveIndex(0);
                    // Calculate position? 
                    // Getting exact coords of cursor in textarea is hard without a library.
                    // Fallback: Show above/below input.
                    return;
                }
            }
        }
        setShowSuggestions(false);
    };

    const selectUser = (user: User) => {
        const textBeforeCursor = value.slice(0, cursorIdx);
        const textAfterCursor = value.slice(cursorIdx);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        const newText = textBeforeCursor.slice(0, lastAt) + `@${user.name} ` + textAfterCursor;
        onChange(newText);
        setShowSuggestions(false);

        // Restore focus and cursor? 
        // Need timeout to allow render
        setTimeout(() => {
            if (inputRef.current) {
                const newPos = lastAt + user.name.length + 2; // @ + name + space
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {showSuggestions && filteredUsers.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    width: 250,
                    maxHeight: 200,
                    overflowY: 'auto',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    marginBottom: 4
                }}>
                    {filteredUsers.map((u, i) => (
                        <div
                            key={u.id}
                            onClick={() => selectUser(u)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                background: i === activeIndex ? 'var(--primary-light)' : 'transparent',
                                color: i === activeIndex ? 'var(--primary)' : 'var(--text-main)',
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{u.name[0]}</div>
                            <div>
                                <div>{u.name}</div>
                                {u.email && <div style={{ fontSize: 10, opacity: 0.7 }}>{u.email}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <textarea
                ref={inputRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={className}
                style={{
                    ...style,
                    minHeight,
                    resize: 'none'
                }}
            />
        </div>
    );
};

export default MentionInput;
