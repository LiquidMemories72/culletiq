import Link from "next/link";
import { ArrowRight, Camera, ShieldCheck, Workflow, BarChart3, FlaskConical } from "lucide-react";

export default function HomePage() {
  return <div className="new-home">
    <section className="new-hero">
      <div className="new-hero-copy">
        <span className="new-kicker"><span className="new-pulse" /> VISIBLE-SPECTRUM RECYCLING INTELLIGENCE</span>
        <h1>Follow the glass.<br/><em>See the decision.</em></h1>
        <p>CulletIQ helps screen whole items before crushing and colour-sort fragments afterward. Try the guided line, inspect an image with the supplied models, and see why a batch is routed or held for review.</p>
        <div className="new-actions"><Link href="/industrial" className="new-cta">Open sorting studio <ArrowRight size={18}/></Link><Link href="/analyse" className="new-secondary">Analyse cullet photo ↗</Link></div>
        <div className="new-hero-foot"><span>01 · See the process</span><span>02 · Inspect a photo</span><span>03 · Review the evidence</span></div>
      </div>
      <div className="new-hero-visual" aria-hidden="true"><div className="new-orbit one"/><div className="new-orbit two"/><div className="new-glass-shard"/><span className="new-float top">◎ CAMERA VIEW</span><span className="new-float bottom">→ REVIEW OR ROUTE</span></div>
    </section>
    <section className="new-section"><div className="new-section-head"><span className="new-kicker">THE PHYSICAL FLOW</span><h2>One facility. Two inspection points.</h2><p>Whole objects travel on a conveyor. Only approved container glass is crushed. Fragments are then inspected on a separate chute, where colour and possible contamination can be assessed.</p></div><div className="new-steps"><article><span>01 / UPSTREAM</span><Camera size={28}/><h3>Inspect whole items</h3><p>The G3 detector marks visible bottles, cookware, ceramic and other objects before the crusher. A questionable item goes to review or rejection.</p></article><article><span>02 / DOWNSTREAM</span><Workflow size={28}/><h3>Inspect falling fragments</h3><p>The G1 segmenter finds visible pieces and estimates clear, green, amber and other classes. A model output is evidence, not a chemical test.</p></article><article><span>03 / OPERATOR</span><ShieldCheck size={28}/><h3>Make the route explainable</h3><p>See the image, detections, model scores and reason. Uncertain results pause at a human decision rather than silently going to a bin.</p></article></div></section>
    <section className="new-tiles"><Link href="/industrial"><span>INTERACTIVE DEMO + MODEL INPUT</span><h3>Sorting studio ↗</h3><p>Watch material move through the actual two-stage layout, then upload or select an image for model inference.</p></Link><Link href="/citizen"><span>FOR EVERYDAY RECYCLING</span><h3>Citizen guide ↗</h3><p>Check a whole item and learn how to prepare it. An unavailable model now reports an error rather than inventing an answer.</p></Link><Link href="/insights"><span>RECORDED PHOTOS ONLY</span><h3>Batch insights ↗</h3><p>Read sample-derived colour distributions, history, comparisons and printable reports from this browser.</p></Link></section>
    <aside className="new-honesty"><FlaskConical size={25}/><div><b>Know the limit.</b><p>RGB imaging cannot prove chemical composition or reliably distinguish every lookalike glass and ceramic. The studio is a decision-support pilot; demo movement is simulated and no factory actuator is connected.</p></div><Link href="/methodology">Read the method <ArrowRight size={16}/></Link></aside>
  </div>;
}
