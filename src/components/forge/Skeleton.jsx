export const Skel = ({ w='100%', h=12, className }) =>
  <div className="f-sk" style={{ width:w, height:h }} aria-hidden />;

/** Skeletons must match the real geometry exactly or arrival causes a jump. */
export const TableSkeleton = ({ rows = 8, cols = 5 }) => (
  <div role="status" aria-label="Loading">
    <div className="flex h-[30px] items-center gap-3 border-b border-line
                    bg-surface-sunken px-3">
      {Array.from({length:cols}).map((_,i)=> <Skel key={i} w={i===0?'22%':'12%'} h={8} />)}
    </div>
    {Array.from({length:rows}).map((_,r)=>(
      <div key={r} className="flex h-9 items-center gap-3 border-b border-line px-3">
        {Array.from({length:cols}).map((_,i)=>
          <Skel key={i} w={i===0?'26%':'11%'} h={10} />)}
      </div>
    ))}
  </div>
);

export const KpiSkeleton = () => (
  <div className="f-card f-kpi"><Skel w="42%" h={8}/>
    <div className="mt-3"><Skel w="60%" h={22}/></div>
    <div className="mt-3"><Skel w="30%" h={8}/></div></div>
);
export const Skeleton = Skel;
export const Spinner = Skel;
