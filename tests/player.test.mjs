import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildEmbedUrl,initialPlayback,updatePlayback} from '../docs/player.mjs';
const id='sjRYYBZHGWA';
const origin='https://h4m4chi-ttr.github.io';
test('iframe targets embed for the same ID, not the live page',()=>{
  const url=new URL(buildEmbedUrl('https://www.youtube.com/live/'+id,origin));
  assert.equal(url.origin,'https://www.youtube.com');
  assert.equal(url.pathname,'/embed/'+id);
  assert.equal(url.searchParams.get('origin'),origin);
  assert.equal(url.searchParams.get('enablejsapi'),'1');
  assert.equal(url.searchParams.get('autoplay'),'0');
});
test('timestamp is translated without forwarding unrelated, playlist, or hostile player settings',()=>{
  const url=new URL(buildEmbedUrl('https://youtu.be/'+id+'?t=1h2m3s&si=abc&list=PLother&autoplay=1&origin=https://evil.test&end=4000',origin));
  assert.equal(url.searchParams.get('start'),'3723');
  assert.equal(url.searchParams.get('end'),'4000');
  for(const key of ['si','list','t']) assert.equal(url.searchParams.has(key),false);
  assert.equal(url.searchParams.get('autoplay'),'0');
  assert.equal(url.searchParams.get('origin'),origin);
});
test('supports numeric start and fragment timestamps, ignores invalid time',()=>{
  for(const [suffix,expected] of [['?start=30','30'],['#t=1m5s','65'],['?t=20s','20'],['?t=nonsense',null],['?t=-2',null]]){
    assert.equal(new URL(buildEmbedUrl('https://youtu.be/'+id+suffix,origin)).searchParams.get('start'),expected);
  }
});
test('rejects unsafe frame sources and origins',()=>{
  assert.throws(()=>buildEmbedUrl('https://evil.test/live/'+id,origin));
  for(const value of ['null','javascript:alert(1)','https://evil@host.test','https://host.test/path']){
    assert.throws(()=>buildEmbedUrl('https://youtu.be/'+id,value));
  }
});
test('ready or buffered does not mean played',()=>{
  for(const event of [{type:'ready'},{type:'state',value:3},{type:'state',value:5},{type:'state',value:-1}]){
    assert.equal(updatePlayback(initialPlayback(),event).played,false);
  }
});
test('only the PLAYING event establishes playback; pause preserves evidence',()=>{
  const playing=updatePlayback(initialPlayback(),{type:'state',value:1});
  assert.equal(playing.phase,'playing'); assert.equal(playing.played,true);
  const paused=updatePlayback(playing,{type:'state',value:2});
  assert.equal(paused.phase,'paused'); assert.equal(paused.played,true);
});
test('ended without PLAYING is not proof',()=>{
  assert.equal(updatePlayback(initialPlayback(),{type:'state',value:0}).played,false);
});
test('embed restriction is distinct from other player errors',()=>{
  for(const value of [101,150]) assert.equal(updatePlayback(initialPlayback(),{type:'error',value}).phase,'restricted');
  for(const value of [2,5,100,153,999]) assert.equal(updatePlayback(initialPlayback(),{type:'error',value}).phase,'error');
});
test('late ready does not erase an error',()=>{
  const error=updatePlayback(initialPlayback(),{type:'error',value:153});
  assert.deepEqual(updatePlayback(error,{type:'ready'}),error);
});
test('API unavailable remains inconclusive, never a playback failure verdict',()=>{
  const state=updatePlayback(initialPlayback(),{type:'unconfirmed'});
  assert.equal(state.phase,'unconfirmed'); assert.equal(state.played,false);
});
test('new preview starts with no evidence from the previous video',()=>{
  const played=updatePlayback(initialPlayback(),{type:'state',value:1});
  assert.equal(played.played,true);
  assert.deepEqual(initialPlayback(),{phase:'idle',played:false,error:null});
});

test('another video in related recommendations resets proof', () => {
  const played = updatePlayback(initialPlayback(), {type:'state',value:1});
  const changed = updatePlayback(played, {type:'different-video'});
  assert.equal(changed.played,false);
  assert.equal(changed.phase,'different');
});
