import { BodyText, Heading, Label } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

export default function ProjectRoadmapScreen() {
  return (
    <Screen>
      <Card>
        <Heading>Roadmap</Heading>
        <BodyText>Use this sequence to turn the starter into a paid product without overbuilding.</BodyText>
      </Card>

      <Card>
        <Label>Phase 1</Label>
        <BodyText>Polish the four free tools, add metadata for web pages, and ship the first public build.</BodyText>
      </Card>

      <Card>
        <Label>Phase 2</Label>
        <BodyText>Create project save slots, add Supabase auth, and persist calculator/generator results.</BodyText>
      </Card>

      <Card>
        <Label>Phase 3</Label>
        <BodyText>Introduce Pro: unlimited saves, premium generators, PDF export, and ad-free web experience.</BodyText>
      </Card>

      <Card>
        <Label>Phase 4</Label>
        <BodyText>Connect Stripe on web, then Apple IAP for iPhone subscriptions after the core value is validated.</BodyText>
      </Card>
    </Screen>
  );
}
