import { Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function CustomerHomeScreen() {
  return (
    <Screen title="Customer Home" description="Discovery, categories, campaign slots, cart prompts, and order shortcuts.">
      <ModuleCard title="Customer modules">
        <Text>• Home discovery</Text>
        <Text>• Catalog search</Text>
        <Text>• Cart and checkout</Text>
        <Text>• Orders, returns, support</Text>
      </ModuleCard>
    </Screen>
  );
}
