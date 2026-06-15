'use client';
import { Home, Building2, Ticket } from 'lucide-react';
import { COLOR_CLASSES } from '@/lib/boardLayout';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function PropertyDetailsModal({ space, onClose }) {
  if (!space) return null;

  const isPurchasable = ['property', 'railway', 'utility'].includes(space.type);

  if (!isPurchasable) {
    return (
      <Modal open={!!space} onClose={onClose} title={space.name} size="sm">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <p className="text-gray-500 mb-6 text-sm">{space.name}</p>
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  const colorBand = space.color ? COLOR_CLASSES[space.color] : 'bg-slate-700';

  return (
    <Modal open={!!space} onClose={onClose} title={null} size="sm" closeOnBackdrop={true}>
      <div className="-mx-6 -mt-6">
        {/* Header Strip */}
        <div className={`${colorBand} px-6 pt-5 pb-4 rounded-t-2xl flex items-center justify-center`}>
          <h2 className="text-[22px] font-black text-white uppercase tracking-widest text-center drop-shadow-sm">
            {space.name}
          </h2>
        </div>

        {/* Property Image Slot */}
        {(space.type === 'property' || space.type === 'railway' || space.type === 'utility') && (
          <div className="w-full px-6 pt-4 bg-surface">
            <div className="w-full h-32 rounded-xl bg-gray-100 overflow-hidden shadow-inner border border-gray-200 relative">
              <img 
                src={`/cities/${space.id}.jpg`} 
                alt={space.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="absolute inset-0 items-center justify-center text-gray-400 text-xs font-semibold hidden bg-slate-100">
                Place {space.id}.jpg in /public/cities
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="px-8 py-5 bg-surface text-center flex flex-col items-center">
          {space.type === 'property' && (
            <>
              <div className="text-2xl font-bold text-gray-600 mb-1">
                RENT <span className="font-sans">₹</span> {space.rent?.[0] ?? 0}
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-4 text-center leading-snug">
                Rent is doubled on owning all unimproved sites in the group.
              </p>

              <div className="w-full max-w-[200px] flex flex-col gap-1.5 mb-5">
                <RowRent
                  label={
                    <div className="flex gap-1 justify-end w-[80px]">
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                    </div>
                  }
                  value={`₹ ${space.rent?.[1] ?? 0}`}
                />
                <RowRent
                  label={
                    <div className="flex gap-1 justify-end w-[80px]">
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                    </div>
                  }
                  value={`₹ ${space.rent?.[2] ?? 0}`}
                />
                <RowRent
                  label={
                    <div className="flex gap-1 justify-end w-[80px]">
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                    </div>
                  }
                  value={`₹ ${space.rent?.[3] ?? 0}`}
                />
                <RowRent
                  label={
                    <div className="flex gap-1 justify-end w-[80px]">
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                      <Home size={18} className="text-emerald-500" fill="currentColor" />
                    </div>
                  }
                  value={`₹ ${space.rent?.[4] ?? 0}`}
                />
                <RowRent
                  label={
                    <div className="flex justify-end w-[80px]">
                      <Building2 size={20} className="text-red-500" fill="currentColor" />
                    </div>
                  }
                  value={`₹ ${space.rent?.[5] ?? 0}`}
                />
              </div>

              <div className="text-[11px] font-bold text-gray-500 mb-1 uppercase">
                Construction ₹ {space.houseCost} each
              </div>
              <div className="text-xl font-bold text-gray-500">
                Mortgage ₹ {space.mortgage}
              </div>
            </>
          )}

          {space.type === 'railway' && (
            <>
              <div className="mb-4">
                <Ticket size={36} className="text-slate-600 mx-auto" />
              </div>
              <div className="w-full flex flex-col gap-2 mb-6">
                <RowRent label="Rent" value="₹ 25" />
                <RowRent label="If 2 stations are owned" value="₹ 50" />
                <RowRent label="If 3 stations are owned" value="₹ 100" />
                <RowRent label="If 4 stations are owned" value="₹ 200" />
              </div>
              <div className="text-xl font-bold text-gray-500 border-t border-gray-200 pt-3 w-full">
                Mortgage ₹ {space.mortgage}
              </div>
            </>
          )}

          {space.type === 'utility' && (
            <>
              <div className="text-[13px] font-medium text-gray-600 space-y-4 px-2 py-4 text-left leading-relaxed">
                <p>If one Utility is owned, rent is <strong className="text-gray-900 font-bold">4 times</strong> amount shown on dice.</p>
                <p>If both Utilities are owned, rent is <strong className="text-gray-900 font-bold">10 times</strong> amount shown on dice.</p>
              </div>
              <div className="text-xl font-bold text-gray-500 border-t border-gray-200 pt-3 w-full mt-2">
                Mortgage ₹ {space.mortgage}
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6 bg-surface rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-b from-[#e34226] to-[#c72710] hover:from-[#f05236] hover:to-[#d83820] text-white font-bold text-[22px] tracking-wide py-2 rounded-lg border-b-[5px] border-[#9a1a08] active:border-b-0 active:translate-y-[5px] active:mb-[5px] transition-all flex items-center justify-center shadow-md"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RowRent({ label, value }) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center text-sm font-semibold text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-400 font-sans tracking-tighter">{value}</div>
    </div>
  );
}
