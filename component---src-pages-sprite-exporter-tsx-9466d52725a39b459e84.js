(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{FiuD:function(e,t,a){"use strict";function r(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}a.r(t);var n=a("dI71"),i=a("q1tI"),o=a.n(i),u=function(){function e(e){this.array=e}var t=e.prototype;return t.read_8=function(e){return this.array[e]},t.read_16=function(e){return this.array[e]+(this.array[e+1]<<8)},e}(),l=function(){function e(e){this.array=e}var t=e.prototype;return t.value=function(e){return this.array[e]},t.high=function(e){var t=this.value(e);return[31&t,(992&t)>>5,(31744&t)>>10]},t.true=function(e){return this.high(e).map((function(e){return 8*e}))},e}(),d=function(e){function t(t){var a;return(a=e.call(this,t)||this).state={image:null},a.canvasRef=o.a.createRef(),a.loadFile=a.loadFile.bind(r(a)),a.load=a.load.bind(r(a)),a}Object(n.a)(t,e);var a=t.prototype;return a.loadFile=function(e){var t=this;console.log("loaded file");var a=new FileReader;a.readAsArrayBuffer(e.target.files[0]),a.onloadend=function(e){var a=new Uint8Array(e.target.result),r=new u(a);t.load(r)}},a.load=function(e){for(var t=new Array(16),a=0;a<16;a++)t[a]=e.read_16(3976420+2*a);for(var r=new l(t),n=this.canvasRef.current.getContext("2d"),i=0;i<10;i++){for(var o=n.getImageData(8*i%16,8*Math.floor(i/2),8,8),u=0;u<32;u++){var d=e.read_8(3934104+32*i+u),c=r.true(15&d),f=r.true((240&d)>>4),s=8*u;o.data[s+0]=c[0],o.data[s+1]=c[1],o.data[s+2]=c[2],o.data[s+3]=255,o.data[s+4]=f[0],o.data[s+5]=f[1],o.data[s+6]=f[2],o.data[s+7]=255}n.putImageData(o,8*i%16,8*Math.floor(i/2))}console.log("loaded palette")},a.render=function(){return o.a.createElement("div",null,o.a.createElement("h2",null,"Sprite exporter"),o.a.createElement("input",{type:"file",onChange:this.loadFile}),o.a.createElement("canvas",{ref:this.canvasRef,width:256,height:64}))},t}(o.a.Component);t.default=d}}]);
//# sourceMappingURL=component---src-pages-sprite-exporter-tsx-9466d52725a39b459e84.js.map