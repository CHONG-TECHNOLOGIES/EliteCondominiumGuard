# Restaurant & Sport Visit Types - Implementation Guide

## Overview

This document describes the implementation of two new visit types for the Elite CondoGuard application:
- **Restaurant Visits**: For visitors going to restaurants within the condominium
- **Sport Visits**: For visitors using sports facilities (e.g., Football, Padel, Tennis)

---

## 1. Database Schema (Supabase SQL)

### Step 1: Create the `restaurants` table

```sql
-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  condominium_id INT4 NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT restaurants_name_condominium_key UNIQUE (name, condominium_id)
);

-- Add index for faster queries
CREATE INDEX idx_restaurants_condominium ON public.restaurants(condominium_id);
CREATE INDEX idx_restaurants_status ON public.restaurants(status);

-- Enable Row Level Security
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (adjust based on your auth setup)
CREATE POLICY "Enable read access for authenticated users" ON public.restaurants
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.restaurants
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.restaurants
  FOR UPDATE
  USING (auth.role() = 'authenticated');
```

### Step 2: Create the `sports` table

```sql
-- Create sports table
CREATE TABLE public.sports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  condominium_id INT4 NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT sports_name_condominium_key UNIQUE (name, condominium_id)
);

-- Add index for faster queries
CREATE INDEX idx_sports_condominium ON public.sports(condominium_id);
CREATE INDEX idx_sports_status ON public.sports(status);

-- Enable Row Level Security
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (adjust based on your auth setup)
CREATE POLICY "Enable read access for authenticated users" ON public.sports
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.sports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.sports
  FOR UPDATE
  USING (auth.role() = 'authenticated');
```

### Step 3: Add columns to `visits` table

```sql
-- Add restaurant_id and sport_id columns to visits table
ALTER TABLE public.visits
  ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  ADD COLUMN sport_id UUID REFERENCES public.sports(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_visits_restaurant ON public.visits(restaurant_id);
CREATE INDEX idx_visits_sport ON public.visits(sport_id);
```

### Step 4: Update `visit_types` table

```sql
-- Add new columns to visit_types table
ALTER TABLE public.visit_types
  ADD COLUMN requires_restaurant BOOLEAN DEFAULT FALSE,
  ADD COLUMN requires_sport BOOLEAN DEFAULT FALSE;

-- Insert new visit types
INSERT INTO public.visit_types (name, icon_key, requires_service_type, requires_restaurant, requires_sport)
VALUES
  ('Restaurante', 'RESTAURANT', FALSE, TRUE, FALSE),
  ('Desporto', 'SPORT', FALSE, FALSE, TRUE);

-- Or update existing visit types if they already exist
UPDATE public.visit_types SET icon_key = 'RESTAURANT', requires_restaurant = TRUE WHERE LOWER(name) LIKE '%restaurante%';
UPDATE public.visit_types SET icon_key = 'SPORT', requires_sport = TRUE WHERE LOWER(name) LIKE '%desporto%' OR LOWER(name) LIKE '%sport%';
```

---

## 2. Sample Data

### Insert Sample Restaurants

```sql
-- Replace 'YOUR_CONDOMINIUM_ID' with your actual condominium UUID
INSERT INTO public.restaurants (condominium_id, name, description, status)
VALUES
  ('YOUR_CONDOMINIUM_ID', 'Restaurante Sabores', 'Restaurante português tradicional', 'ACTIVE'),
  ('YOUR_CONDOMINIUM_ID', 'Pizzeria Bella Napoli', 'Pizzas artesanais', 'ACTIVE'),
  ('YOUR_CONDOMINIUM_ID', 'Sushi Bar Zen', 'Culinária japonesa', 'ACTIVE'),
  ('YOUR_CONDOMINIUM_ID', 'Café Central', 'Café e pastelaria', 'ACTIVE');
```

### Insert Sample Sports

```sql
-- Replace 'YOUR_CONDOMINIUM_ID' with your actual condominium UUID
INSERT INTO public.sports (condominium_id, name, description, status)
VALUES
  ('YOUR_CONDOMINIUM_ID', 'Futebol', 'Campo de futebol', 'ACTIVE'),
  ('YOUR_CONDOMINIUM_ID', 'Padel', 'Quadra de padel', 'ACTIVE'),
  ('YOUR_CONDOMINIUM_ID', 'Ténis', 'Court de ténis', 'ACTIVE'),
  ('YOUR_CONDOMINIUM_ID', 'Piscina', 'Piscina coberta', 'ACTIVE'),
  ('YOUR_CONDOMINIUM_ID', 'Ginásio', 'Academia fitness', 'ACTIVE'),
  ('YOUR_CONDOMINIUM_ID', 'Squash', 'Quadra de squash', 'ACTIVE');
```

---

## 3. Frontend Implementation Summary

### Files Modified

1. **types.ts**
   - Added `Restaurant` interface
   - Added `Sport` interface
   - Updated `VisitTypeConfig` with `requires_restaurant` and `requires_sport` flags
   - Updated `Visit` interface with `restaurant_id` and `sport_id` fields

2. **db.ts (Dexie)**
   - Added `restaurants` table
   - Added `sports` table
   - Updated `clearAllData()` method

3. **Supabase.ts**
   - Added `getRestaurants(condoId)` method
   - Added `getSports(condoId)` method

4. **dataService.ts**
   - Added `getRestaurants()` method with cache-then-network strategy
   - Added `getSports()` method with cache-then-network strategy
   - Added `refreshRestaurantsAndSports()` private method

5. **NewEntry.tsx**
   - Added Restaurant and Sport icons (UtensilsCrossed, Dumbbell)
   - Updated icon mapping to support RESTAURANT and SPORT icons
   - Added state for restaurants, sports, restaurantId, sportId
   - Added modal states for restaurant and sport selection
   - Updated `useEffect` to fetch restaurants and sports

---

## 4. Next Steps - Complete the UI

### A. Add Helper Functions to NewEntry.tsx

Add these helper functions after the `getSelectedServiceLabel` function:

```typescript
const getSelectedRestaurantLabel = () => {
  const r = restaurants.find(r => r.id === restaurantId);
  return r ? r.name : '';
};

const getSelectedSportLabel = () => {
  const s = sports.find(s => s.id === sportId);
  return s ? s.name : '';
};
```

### B. Update the `handleSubmit` function

Update the submit handler to include restaurant_id and sport_id:

```typescript
const handleSubmit = async () => {
  if (!visitorName || !unitId) return alert("Nome e Unidade são obrigatórios");

  // Check dynamic requirements
  if (selectedTypeConfig?.requires_service_type && !serviceTypeId) {
    return alert("Tipo de serviço obrigatório");
  }
  if (selectedTypeConfig?.requires_restaurant && !restaurantId) {
    return alert("Restaurante obrigatório");
  }
  if (selectedTypeConfig?.requires_sport && !sportId) {
    return alert("Desporto obrigatório");
  }

  const visitData = {
    condominium_id: user!.condominium_id,
    visitor_name: visitorName,
    visitor_doc: visitorDoc,
    visitor_phone: visitorPhone,
    visit_type: selectedType as VisitType,
    service_type: serviceTypeId,
    restaurant_id: restaurantId || undefined,
    sport_id: sportId || undefined,
    unit_id: unitId,
    reason,
    photo_url: photo,
    qr_token: qrToken,
    approval_mode: approvalMode,
    guard_id: user!.id
  };

  await api.createVisit(visitData);
  navigate('/day-list');
};
```

### C. Add Restaurant Selection UI to Step 2

In the `renderStep2()` function, after the service type selection, add:

```jsx
{selectedTypeConfig?.requires_restaurant && (
  <div>
    <label className="block text-sm font-bold text-slate-500 mb-1">Restaurante *</label>
    <button
      onClick={() => setShowRestaurantModal(true)}
      className={`input-field h-[50px] text-left flex items-center justify-between px-3 ${restaurantId ? 'bg-white border-slate-300' : 'bg-slate-50 text-slate-400'}`}
    >
      {restaurantId ? (
         <span className="text-slate-800 font-bold">{getSelectedRestaurantLabel()}</span>
      ) : (
        <span>Selecione o Restaurante...</span>
      )}
      <UtensilsCrossed size={18} className="text-slate-400"/>
    </button>
  </div>
)}

{selectedTypeConfig?.requires_sport && (
  <div>
    <label className="block text-sm font-bold text-slate-500 mb-1">Desporto *</label>
    <button
      onClick={() => setShowSportModal(true)}
      className={`input-field h-[50px] text-left flex items-center justify-between px-3 ${sportId ? 'bg-white border-slate-300' : 'bg-slate-50 text-slate-400'}`}
    >
      {sportId ? (
         <span className="text-slate-800 font-bold">{getSelectedSportLabel()}</span>
      ) : (
        <span>Selecione o Desporto...</span>
      )}
      <Dumbbell size={18} className="text-slate-400"/>
    </button>
  </div>
)}
```

### D. Add Restaurant Modal

Add this modal at the end of the component, after the `showServiceModal`:

```jsx
{showRestaurantModal && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh]">
       <div className="p-4 border-b flex justify-between items-center">
         <h3 className="font-bold text-lg">Selecionar Restaurante</h3>
         <button onClick={() => setShowRestaurantModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
       </div>
       <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
         {restaurants.map(r => (
           <button
             key={r.id}
             onClick={() => { setRestaurantId(r.id); setShowRestaurantModal(false); }}
             className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col items-center justify-center gap-2 ${restaurantId === r.id ? 'border-accent bg-sky-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
           >
             <div className={restaurantId === r.id ? 'text-accent' : 'text-slate-400'}>
               <UtensilsCrossed size={40} />
             </div>
             <span className="font-bold text-sm text-center text-slate-700">{r.name}</span>
             {r.description && <span className="text-xs text-slate-500 text-center">{r.description}</span>}
           </button>
         ))}
       </div>
    </div>
  </div>
)}
```

### E. Add Sport Modal

Add this modal after the restaurant modal:

```jsx
{showSportModal && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh]">
       <div className="p-4 border-b flex justify-between items-center">
         <h3 className="font-bold text-lg">Selecionar Desporto</h3>
         <button onClick={() => setShowSportModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
       </div>
       <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
         {sports.map(s => (
           <button
             key={s.id}
             onClick={() => { setSportId(s.id); setShowSportModal(false); }}
             className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col items-center justify-center gap-2 ${sportId === s.id ? 'border-accent bg-sky-50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
           >
             <div className={sportId === s.id ? 'text-accent' : 'text-slate-400'}>
               <Dumbbell size={40} />
             </div>
             <span className="font-bold text-sm text-center text-slate-700">{s.name}</span>
             {s.description && <span className="text-xs text-slate-500 text-center">{s.description}</span>}
           </button>
         ))}
       </div>
    </div>
  </div>
)}
```

---

## 5. Testing Checklist

- [ ] Create `restaurants` table in Supabase
- [ ] Create `sports` table in Supabase
- [ ] Add columns to `visits` table
- [ ] Update `visit_types` table with new columns
- [ ] Insert sample restaurants
- [ ] Insert sample sports
- [ ] Insert "Restaurante" visit type in `visit_types`
- [ ] Insert "Desporto" visit type in `visit_types`
- [ ] Verify restaurant icons appear correctly on NewEntry page
- [ ] Verify sport icons appear correctly on NewEntry page
- [ ] Test restaurant selection modal
- [ ] Test sport selection modal
- [ ] Test creating a visit with restaurant selected
- [ ] Test creating a visit with sport selected
- [ ] Verify data saves correctly to Supabase
- [ ] Test offline functionality
- [ ] Test sync when going from offline to online

---

## 6. Icon Keys Reference

When creating visit types in Supabase, use these `icon_key` values:

| Icon Key | Display Icon | Use Case |
|----------|--------------|----------|
| `USER` | 👤 | Visitante |
| `TRUCK` | 🚚 | Entrega |
| `WRENCH` | 🔧 | Serviço |
| `GRADUATION` | 🎓 | Estudante |
| `RESTAURANT` | 🍴 | Restaurante |
| `SPORT` | 🏋️ | Desporto |

---

## 7. Important Notes

1. **Condominium-Specific Data**: Both restaurants and sports are filtered by `condominium_id`, so each condominium can have its own list
2. **Caching**: Data is cached locally in IndexedDB for offline access
3. **Sync Strategy**: Uses cache-then-network strategy for optimal performance
4. **Validation**: The submit handler validates that required fields (restaurant or sport) are filled before allowing submission
5. **Status Field**: Both tables have a `status` field to allow soft deletion (set to 'INACTIVE' instead of deleting)

---

## Complete! 🎉

You now have full support for Restaurant and Sport visit types with selection modals!
