"use client";
import { useState } from "react";

export default function AgentTest() {
  const [clickCount,      setClickCount]      = useState(0);
  const [touchCount,      setTouchCount]      = useState(0);
  const [touchStartCount, setTouchStartCount] = useState(0);

  return (
    <div style={{padding: 30, fontFamily: "sans-serif", fontSize: 16}}>
      <h2>Click event</h2>
      <p>Count: <strong>{clickCount}</strong></p>
      <button onClick={() => setClickCount(c => c + 1)}
        style={{padding:"16px 32px", background:"green", color:"white", border:"none", borderRadius:8, fontSize:18, marginBottom:24, display:"block", width:"100%"}}>
        onClick button
      </button>

      <h2>onTouchEnd event</h2>
      <p>Count: <strong>{touchCount}</strong></p>
      <button onTouchEnd={() => setTouchCount(c => c + 1)}
        style={{padding:"16px 32px", background:"blue", color:"white", border:"none", borderRadius:8, fontSize:18, marginBottom:24, display:"block", width:"100%"}}>
        onTouchEnd button
      </button>

      <h2>onTouchStart event</h2>
      <p>Count: <strong>{touchStartCount}</strong></p>
      <button onTouchStart={() => setTouchStartCount(c => c + 1)}
        style={{padding:"16px 32px", background:"purple", color:"white", border:"none", borderRadius:8, fontSize:18, display:"block", width:"100%"}}>
        onTouchStart button
      </button>
    </div>
  );
}
