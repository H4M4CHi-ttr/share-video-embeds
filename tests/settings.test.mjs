import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readTrackingPreference,saveTrackingPreference,TRACKING_KEY} from '../docs/settings.mjs';
const store=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('first visit defaults to OFF',()=>assert.equal(readTrackingPreference(store()),false));
test('ON persists and is restored',()=>{const s=store();assert.equal(saveTrackingPreference(s,true),true);assert.equal(readTrackingPreference(s),true);});
test('OFF persists after ON',()=>{const s=store();saveTrackingPreference(s,true);saveTrackingPreference(s,false);assert.equal(s.getItem(TRACKING_KEY),'false');assert.equal(readTrackingPreference(s),false);});
test('unavailable or corrupt storage does not break conversion',()=>{
  for(const s of [null,{getItem(){throw new Error('blocked')}},{getItem(){return 'yes'}}]) assert.equal(readTrackingPreference(s),false);
  assert.equal(saveTrackingPreference(null,true),false);
  assert.equal(saveTrackingPreference({setItem(){throw new Error('full')}},true),false);
});
