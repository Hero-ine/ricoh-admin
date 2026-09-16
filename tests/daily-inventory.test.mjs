import test from 'node:test';
import assert from 'node:assert/strict';
import {categories,createDailyState,updateDaily,quantities} from '../scripts/daily-inventory.mjs';
const time=s=>Date.parse(`2026-09-16T${s}+08:00`);
const snapshot=(at,quantity,ok=true)=>({products:Object.fromEntries(categories.map(id=>[id,{checkedAt:new Date(at).toISOString(),ok,matches:quantity===null?[]:[{title:id,reason:`库存字段为 ${quantity}`}]}]))});
test('positive increments only, baseline ignored, categories independent',()=>{
 const state=createDailyState(time('00:00:00'));
 for(const [i,q] of [0,3,1,2].entries())updateDaily(state,snapshot(time(`00:00:${i}0`),q),time(`00:00:${i}0`));
 assert.deepEqual(Object.values(state.days['2026-09-16'].values),[4,4,4,4]);
 const next=snapshot(time('00:00:40'),2);next.products[categories[2]].matches[0].reason='库存字段为 5';
 updateDaily(state,next,time('00:00:40'));assert.equal(state.days['2026-09-16'].values[categories[2]],7);
 assert.equal(state.days['2026-09-16'].values[categories[1]],4);
});
test('22:00 excluded and finalization happens at 22:05',()=>{
 const state=createDailyState(time('21:59:00'));
 updateDaily(state,snapshot(time('21:59:00'),0),time('21:59:00'));
 updateDaily(state,snapshot(time('21:59:30'),2),time('21:59:30'));
 updateDaily(state,snapshot(time('22:00:00'),9),time('22:00:00'));
 assert.equal(state.days['2026-09-16'].values[categories[0]],2);
 assert.equal(state.days['2026-09-16'].finalized,false);
 updateDaily(state,null,time('22:05:00'));assert.equal(state.days['2026-09-16'].finalized,true);
});
test('invalid observations reset baseline rather than invent a zero',()=>{
 const state=createDailyState(time('00:00:00'));
 updateDaily(state,snapshot(time('00:00:00'),4),time('00:00:00'));
 updateDaily(state,snapshot(time('00:00:10'),null),time('00:00:10'));
 updateDaily(state,snapshot(time('00:00:20'),8),time('00:00:20'));
 assert.equal(state.days['2026-09-16'].values[categories[0]],0);
 assert.equal(state.days['2026-09-16'].incomplete,true);
});
test('duplicate samples, restart and failure do not double count',()=>{
 let state=createDailyState(time('00:00:00'));
 updateDaily(state,snapshot(time('00:00:00'),0),time('00:00:00'));
 updateDaily(state,snapshot(time('00:00:10'),2),time('00:00:10'));
 state=JSON.parse(JSON.stringify(state));updateDaily(state,snapshot(time('00:00:10'),2),time('00:00:20'));
 updateDaily(state,snapshot(time('00:00:30'),9,false),time('00:00:30'));
 assert.equal(state.days['2026-09-16'].values[categories[0]],2);
});
test('long gaps establish fresh baselines and missing dates are incomplete',()=>{
 const state=createDailyState(time('00:00:00'));
 updateDaily(state,snapshot(time('00:00:00'),0),time('00:00:00'));
 updateDaily(state,snapshot(time('01:00:00'),8),time('01:00:00'));
 updateDaily(state,null,time('22:05:00')+86400000);
 assert.equal(state.days['2026-09-16'].values[categories[0]],0);
 assert.equal(state.days['2026-09-17'].incomplete,true);
 assert.equal(state.days['2026-09-17'].values[categories[0]],null);
});
test('numeric inventory is required; unknown, negative and duplicate keys rejected',()=>{
 assert.equal(quantities([]),null);
 assert.equal(quantities([{title:'a',reason:'库存字段为 -1'}]),null);
 assert.equal(quantities([{title:'a',reason:'库存字段为 0'},{title:'a',reason:'库存字段为 2'}]),null);
});
