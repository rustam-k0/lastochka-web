from PIL import Image
from pathlib import Path
base=Path('/var/folders/1p/3170tk150m593dfmsx6fflx40000gn/T')
refs={
'home':('codex-clipboard-563788f9-ff37-457c-a8bf-265f589171b7.png',(710,1536)),
'catalog':('codex-clipboard-bbc3145d-9b43-44ac-810c-8c19a899c717.png',(710,1536)),
'cart':('codex-clipboard-41f3a4a0-5379-4858-b8af-1e4e976801a4.png',(946,2048)),
'bird':('codex-clipboard-3e8d3335-97e8-4bc7-9153-3b49b3e59e46.png',(946,2048)),
'logo':('TemporaryItems/NSIRD_screencaptureui_ksnpUd/Screenshot 2026-09-16 at 23.54.08.png',(1886,1344))}
def crop(ref,name,box):
 p,sz=refs[ref]; im=Image.open(base/p);sx=im.width/sz[0];sy=im.height/sz[1]
 im=im.crop(tuple(round(v*(sx if i%2==0 else sy)) for i,v in enumerate(box)))
 im.save('public/images/'+name+'.webp',quality=94)
 return im
crop('home','school',(42,640,351,857))
crop('home','bakery',(372,609,680,857))
crop('home','local',(42,968,351,1186))
crop('home','cleaning',(372,975,680,1186))
crop('home','diet',(193,1243,351,1385))
for name,box in {'hot':(30,617,240,756),'grill':(250,590,460,756),'salad':(469,607,680,756),'pies':(30,833,240,976),'fastfood':(250,834,460,976),'pickles':(469,856,680,976),'buns':(30,1163,240,1304),'bread':(250,1138,460,1304),'flatbread':(469,1163,680,1304)}.items():crop('catalog',name,box)
for name,box in {'raspberry':(40,630,195,791),'khychin-potato':(39,827,194,984),'khychin-cheese':(39,1021,194,1178),'yogurt':(41,1213,194,1370)}.items():crop('cart',name,box)
crop('bird','swallow',(184,891,738,1338))
im=crop('logo','logo',(34,31,91,89));im.save('public/images/logo.png')
