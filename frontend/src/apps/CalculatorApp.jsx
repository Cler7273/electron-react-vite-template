import React, { useState } from 'react';
import { useAppEngine } from '../hooks/useAppEngine';
import { UniversalAppShell, UaeListItem } from '../components/UniversalComponents';

export const CalculatorApp = ({ windowAPI, onHome }) => {
    // 1. Initialize Engine for "History" tracking
    const { data: history, addEntity, removeEntity, isLoading } = useAppEngine(
        'app_calculator',
        { name: 'Calculator', themeColor: '#f59e0b' },
        'calculation'
    );

    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    // 2. Calculator Logic
    const handleNumber = (num) => {
        setDisplay(prev => prev === '0' ? String(num) : prev + num);
    };

    const handleOperator = (op) => {
        if (display === 'Error') return; // Don't allow operators on an error
        setEquation(display + ' ' + op + ' ');
        setDisplay('0');
    };

    const calculate = async () => {
        if (!equation) return;

        const fullExpr = equation + display;
        let result;

        try {
            // --- SAFE MATH PARSER REPLACING EVAL ---
            // 1. Split the string (e.g., "12 + 5" -> ["12", "+", "5"])
            const parts = fullExpr.trim().split(' ');
            const num1 = parseFloat(parts[0]);
            const operator = parts[1];
            const num2 = parseFloat(parts[2]);

            // 2. Perform the logic based on the operator
            switch (operator) {
                case '+': result = num1 + num2; break;
                case '-': result = num1 - num2; break;
                case '*': result = num1 * num2; break;
                case '/': result = num2 !== 0 ? num1 / num2 : "Infinity"; break;
                default: throw new Error("Unknown Operator");
            }
            // ---------------------------------------

            if (result === "Infinity") throw new Error("Div by Zero");

            setDisplay(String(result));
            setEquation('');

            // Save to History (Background Task)
            addEntity({
                expression: fullExpr,
                result: String(result),
                timestamp: new Date().toLocaleTimeString()
            }).catch(e => console.error("OS Log: History save failed", e));

        } catch (err) {
            setDisplay('Error');
            setEquation('');
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
    };

    // 3. UI Slots
    const SidebarContent = (
        <div className="p-4 flex flex-col h-full">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">History</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
                {history.map(item => (
                    <UaeListItem
                        key={item.id}
                        title={item.result}
                        subtitle={item.expression}
                        actions={
                            <button onClick={(e) => { e.stopPropagation(); removeEntity(item.id); }} className="text-xs opacity-50 hover:opacity-100">🗑️</button>
                        }
                        onClick={() => setDisplay(item.result)}
                    />
                ))}
                {history.length === 0 && <p className="text-gray-600 text-xs italic">No history yet</p>}
            </div>
        </div>
    );

    const MainContent = (
        <div className="max-w-xs mx-auto mt-10 p-4 bg-black/40 rounded-2xl border border-white/5 shadow-2xl">
            {/* Display */}
            <div className="text-right mb-4 p-4 bg-black/60 rounded-xl border border-white/5">
                <div className="text-gray-500 text-xs h-4">{equation}</div>
                <div className="text-white text-4xl font-light truncate">{display}</div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2">
                <button onClick={clear} className="col-span-3 p-4 bg-gray-800/50 hover:bg-gray-700 text-white rounded-lg transition-colors">AC</button>
                <button onClick={() => handleOperator('/')} className="p-4 bg-amber-600/20 text-amber-500 hover:bg-amber-600/40 rounded-lg font-bold">÷</button>

                {[7, 8, 9].map(n => <button key={n} onClick={() => handleNumber(n)} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-lg">{n}</button>)}
                <button onClick={() => handleOperator('*')} className="p-4 bg-amber-600/20 text-amber-500 hover:bg-amber-600/40 rounded-lg font-bold">×</button>

                {[4, 5, 6].map(n => <button key={n} onClick={() => handleNumber(n)} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-lg">{n}</button>)}
                <button onClick={() => handleOperator('-')} className="p-4 bg-amber-600/20 text-amber-500 hover:bg-amber-600/40 rounded-lg font-bold">-</button>

                {[1, 2, 3].map(n => <button key={n} onClick={() => handleNumber(n)} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-lg">{n}</button>)}
                <button onClick={() => handleOperator('+')} className="p-4 bg-amber-600/20 text-amber-500 hover:bg-amber-600/40 rounded-lg font-bold">+</button>

                <button onClick={() => handleNumber(0)} className="col-span-2 p-4 bg-white/5 hover:bg-white/10 text-white rounded-lg">0</button>
                <button onClick={() => setDisplay(prev => prev.includes('.') ? prev : prev + '.')} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-lg">.</button>
                <button onClick={calculate} className="p-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]">=</button>
            </div>
        </div>
    );

    return (
        <UniversalAppShell
            appName="Calculator"
            themeColor="#f59e0b"
            windowAPI={windowAPI}
            onHome={onHome}
            sidebarContent={SidebarContent}
        >
            {MainContent}
        </UniversalAppShell>
    );
};