import {
    CheckCircle,
    ShieldCheck,
    X,
} from 'lucide-react';
import { COLOR_MAP, ICON_MAP } from './templateMeta';

export default function TemplateCard({ template, onSelect }) {
    const colors = COLOR_MAP[template.color] || COLOR_MAP.indigo;
    const IconComponent = ICON_MAP[template.icon] || ShieldCheck;

    return (
        <button
            type="button"
            onClick={() => onSelect?.(template)}
            className={`relative bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer transition-all duration-200 group hover:shadow-lg ${colors.border}`}
        >
            {template.badge ? (
                <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {template.badge}
                </span>
            ) : null}

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                <IconComponent size={20} className={colors.icon} />
            </div>

            <h3 className="mt-3 font-bold text-slate-900 text-base text-left">{template.name}</h3>
            <p className="mt-1 text-sm text-slate-500 text-left line-clamp-2">{template.description}</p>

            <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 text-xs text-slate-600 leading-relaxed text-left">
                {template.useCase}
            </div>

            <div className="mt-4 text-left">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">What's included:</p>
                {template.permissions.slice(0, 3).map((permission) => (
                    <div key={permission} className="flex items-start gap-1.5 mt-1">
                        <CheckCircle size={11} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-600">{permission}</span>
                    </div>
                ))}
                {template.permissions.length > 3 ? (
                    <div className="text-xs text-slate-400 mt-1 ml-4">
                        +{template.permissions.length - 3} more
                    </div>
                ) : null}
            </div>

            <div className="mt-2 text-left">
                {template.restrictions.slice(0, 2).map((restriction) => (
                    <div key={restriction} className="flex items-start gap-1.5 mt-1">
                        <X size={11} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-red-500">{restriction}</span>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">{template.estimatedPolicies} policies</span>
                <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    Use template -&gt;
                </span>
            </div>
        </button>
    );
}
