import { InformationScreen } from "../src/features/information/InformationScreen";
import { aboutSections } from "../src/features/information/information.data";

export default function AboutRoute() { return <InformationScreen description="Amiyo-Go connects customers, sellers, fulfilment, and support in one accountable marketplace." eyebrow="OUR STORY" sections={aboutSections} title="About Amiyo-Go" />; }
