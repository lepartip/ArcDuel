import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./wagmi";
import { parseEther, formatEther } from "viem";
import { shortAddr, formatDistanceToNow } from "./utils";

const ADDR = (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000";
const ABI = [
  { name: "create", type: "function", stateMutability: "payable", inputs: [{ name: "opponent", type: "address" }, { name: "question", type: "string" }, { name: "optionA", type: "string" }, { name: "optionB", type: "string" }, { name: "creatorPick", type: "uint8" }], outputs: [{ type: "uint256" }] },
  { name: "accept", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }, { name: "pick", type: "uint8" }], outputs: [] },
  { name: "resolve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "result", type: "uint8" }], outputs: [] },
  { name: "cancel", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "getAll", type: "function", stateMutability: "view", inputs: [{ name: "count", type: "uint256" }], outputs: [{ type: "tuple[]", components: [{ name: "id", type: "uint256" }, { name: "creator", type: "address" }, { name: "opponent", type: "address" }, { name: "question", type: "string" }, { name: "optionA", type: "string" }, { name: "optionB", type: "string" }, { name: "creatorPick", type: "uint8" }, { name: "opponentPick", type: "uint8" }, { name: "stake", type: "uint256" }, { name: "result", type: "uint8" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint256" }, { name: "resolvedAt", type: "uint256" }] }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const AC = "#dc2626";
const STATUS_LABELS = ["Open", "Accepted", "Resolved", "Cancelled"];
const STATUS_COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#64748b"];

export default function App() {
  const { isConnected, address } = useAccount();
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [opponent, setOpponent] = useState(""); const [question, setQuestion] = useState(""); const [optionA, setOptionA] = useState(""); const [optionB, setOptionB] = useState(""); const [creatorPick, setCreatorPick] = useState<1 | 2>(1); const [stake, setStake] = useState("1");
  const [acceptId, setAcceptId] = useState(""); const [acceptPick, setAcceptPick] = useState<1 | 2>(2);
  const [done, setDone] = useState(false);

  const { data: duels, refetch } = useReadContract({ address: ADDR, abi: ABI, functionName: "getAll", args: [BigInt(20)], query: { refetchInterval: 8000 } });
  const { data: total } = useReadContract({ address: ADDR, abi: ABI, functionName: "total" });
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  if (isSuccess && !done) { setDone(true); refetch(); setOpponent(""); setQuestion(""); setOptionA(""); setOptionB(""); setTimeout(() => setDone(false), 3000); }
  const isLoading = isPending || isConfirming;

  const list = (duels as any[]) ?? [];
  const stakeBig = (() => { try { return parseEther(stake); } catch { return 0n; } })();

  return (
    <div className="min-h-screen bg-[#080b14]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 z-50 bg-[#080b14]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚔️</span>
          <span className="font-bold text-white text-lg">Arc<span style={{ color: AC }}>Duel</span></span>
          <span className="hidden sm:block text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700">Arc Testnet</span>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </header>
      <main className="relative z-10 max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚔️</div>
          <h1 className="text-4xl font-black text-white mb-3">Arc<span style={{ color: AC }}>Duel</span></h1>
          <p className="text-slate-400 text-sm">Challenge anyone to a 1v1 prediction duel. Winner takes the pot.</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-full border border-slate-700 text-slate-400 text-sm">{total?.toString() ?? "0"} duels fought</div>
        </div>

        <div className="flex bg-slate-900/60 rounded-xl p-1 mb-5 border border-white/8">
          {(["browse", "create"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "text-white" : "text-slate-400 hover:text-white"}`} style={tab === t ? { background: AC } : {}}>
              {t === "browse" ? "⚔️ Browse Duels" : "✚ Challenge"}
            </button>
          ))}
        </div>

        {tab === "create" && (
          !isConnected ? <div className="text-center py-8 text-slate-500">Connect wallet to challenge someone</div> : (
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 mb-5">
              <h2 className="font-bold text-white mb-4">Issue a Challenge ⚔️</h2>
              <input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Opponent 0x... address *" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-mono mb-2" />
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Question / prediction *" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none mb-2" />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input value={optionA} onChange={e => setOptionA(e.target.value)} placeholder="Option A *" className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
                <input value={optionB} onChange={e => setOptionB(e.target.value)} placeholder="Option B *" className="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
              </div>
              <div className="mb-3">
                <label className="text-xs text-slate-400 block mb-2">Your Pick</label>
                <div className="flex gap-2">
                  <button onClick={() => setCreatorPick(1)} className="flex-1 py-2 rounded-xl text-sm font-bold border transition-all" style={creatorPick === 1 ? { background: `${AC}30`, color: AC, borderColor: `${AC}60` } : { borderColor: "rgba(255,255,255,0.1)", color: "#64748b" }}>A{optionA ? `: ${optionA}` : ""}</button>
                  <button onClick={() => setCreatorPick(2)} className="flex-1 py-2 rounded-xl text-sm font-bold border transition-all" style={creatorPick === 2 ? { background: `${AC}30`, color: AC, borderColor: `${AC}60` } : { borderColor: "rgba(255,255,255,0.1)", color: "#64748b" }}>B{optionB ? `: ${optionB}` : ""}</button>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-1">Stake (USDC) — opponent must match</label>
                <input type="number" value={stake} onChange={e => setStake(e.target.value)} step="0.1" min="0.01" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
              </div>
              {done ? <div className="py-3 text-center rounded-xl font-bold text-sm" style={{ background: `${AC}20`, color: AC }}>⚔️ Duel issued!</div>
                : <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "create", args: [opponent as `0x${string}`, question, optionA, optionB, creatorPick], value: stakeBig })} disabled={isLoading || !opponent || !question || !optionA || !optionB || stakeBig === 0n} className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50" style={{ background: AC }}>{isLoading ? (isPending ? "Confirm..." : "Issuing...") : `⚔️ Challenge (${stake} USDC stake)`}</button>}
              {error && <p className="mt-2 text-red-400 text-xs text-center">{error.message?.includes("User rejected") ? "Cancelled" : error.message?.slice(0, 80)}</p>}
            </div>
          )
        )}

        {tab === "browse" && (
          <>
            {isConnected && (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 mb-4">
                <h3 className="text-sm font-bold text-white mb-2">Accept a Duel</h3>
                <div className="flex gap-2">
                  <input type="number" value={acceptId} onChange={e => setAcceptId(e.target.value)} placeholder="Duel ID" className="w-24 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                  <div className="flex gap-1">
                    <button onClick={() => setAcceptPick(1)} className="px-3 py-2 rounded-xl text-sm font-bold border transition-all" style={acceptPick === 1 ? { background: `${AC}30`, color: AC, borderColor: `${AC}60` } : { borderColor: "rgba(255,255,255,0.1)", color: "#64748b" }}>A</button>
                    <button onClick={() => setAcceptPick(2)} className="px-3 py-2 rounded-xl text-sm font-bold border transition-all" style={acceptPick === 2 ? { background: `${AC}30`, color: AC, borderColor: `${AC}60` } : { borderColor: "rgba(255,255,255,0.1)", color: "#64748b" }}>B</button>
                  </div>
                  <button onClick={() => {
                    const d = list.find((x: any) => x.id.toString() === acceptId);
                    writeContract({ address: ADDR, abi: ABI, functionName: "accept", args: [BigInt(acceptId || "0"), acceptPick], value: d?.stake ?? 0n });
                  }} disabled={isLoading || !acceptId} className="flex-1 px-3 py-2 rounded-xl font-bold text-sm text-white disabled:opacity-50" style={{ background: AC }}>Accept</button>
                </div>
                {done && <p className="mt-2 text-xs text-center" style={{ color: AC }}>⚔️ Duel accepted!</p>}
                {error && <p className="mt-2 text-red-400 text-xs">{error.message?.includes("User rejected") ? "Cancelled" : error.message?.slice(0, 80)}</p>}
              </div>
            )}
            <div className="space-y-3">
              {list.map((d: any, i: number) => (
                <div key={i} className="bg-slate-900/60 border border-white/8 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: STATUS_COLORS[d.status] + "25", color: STATUS_COLORS[d.status] }}>{STATUS_LABELS[d.status]}</span>
                    <span className="text-slate-400 text-xs shrink-0">#{d.id.toString()}</span>
                  </div>
                  <p className="text-white font-bold text-sm mb-2">{d.question}</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-slate-800/40 rounded-lg p-2 text-center border" style={d.creatorPick === 1 ? { borderColor: `${AC}40` } : { borderColor: "transparent" }}>
                      <p className="text-white text-xs font-semibold">A: {d.optionA}</p>
                      <p className="text-slate-500 text-xs">{shortAddr(d.creator)}</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-lg p-2 text-center border" style={d.creatorPick === 2 ? { borderColor: `${AC}40` } : { borderColor: "transparent" }}>
                      <p className="text-white text-xs font-semibold">B: {d.optionB}</p>
                      <p className="text-slate-500 text-xs">{shortAddr(d.opponent)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Stake: <span className="font-bold" style={{ color: AC }}>{parseFloat(formatEther(d.stake)).toFixed(2)} USDC each</span></span>
                    <span className="text-slate-600 text-xs">{formatDistanceToNow(Number(d.createdAt))}</span>
                  </div>
                  {d.status === 2 && d.result > 0 && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: "#22c55e" }}>✅ Result: {d.result === 1 ? `A — ${d.optionA}` : `B — ${d.optionB}`}</p>
                  )}
                  {isConnected && d.status === 1 && address?.toLowerCase() === d.creator?.toLowerCase() && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "resolve", args: [d.id, 1] })} disabled={isLoading} className="flex-1 text-xs py-1.5 rounded-lg font-bold text-white disabled:opacity-50" style={{ background: "#22c55e" }}>A Wins</button>
                      <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "resolve", args: [d.id, 2] })} disabled={isLoading} className="flex-1 text-xs py-1.5 rounded-lg font-bold text-white disabled:opacity-50" style={{ background: AC }}>B Wins</button>
                    </div>
                  )}
                  {isConnected && d.status === 0 && address?.toLowerCase() === d.creator?.toLowerCase() && (
                    <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "cancel", args: [d.id] })} disabled={isLoading} className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-all">Cancel & Refund</button>
                  )}
                </div>
              ))}
              {list.length === 0 && <div className="text-center py-10 text-slate-500">No duels yet — issue a challenge!</div>}
            </div>
          </>
        )}
        <footer className="mt-10 text-center text-xs text-slate-600"><p>ArcDuel · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noreferrer" className="hover:text-slate-400">{ADDR.slice(0,6)}...{ADDR.slice(-4)}</a> · Chain {arcTestnet.id}</p></footer>
      </main>
    </div>
  );
}
