<?php

// ============================================================
// ARKZEN ENGINE — FACTORY BUILDER
// Generates Laravel Model Factory classes for testing data.
// Auto-generates fake data definitions from column types.
// ============================================================

namespace App\Arkzen\Builders;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class FactoryBuilder
{
    public static function build(array $module): void
    {
        $api = $module['api'];
        $db  = $module['database'];

        // Only build factory if factory: true declared in @arkzen:api
        if (empty($api['factory'])) return;

        $modelName = $api['model'];
        $filePath  = database_path("factories/Arkzen/{$modelName}Factory.php");

        File::ensureDirectoryExists(database_path('factories/Arkzen'));

        $definition = self::generateDefinition($db['columns'] ?? []);

        $content = "<?php

// ============================================================
// ARKZEN GENERATED FACTORY — {$modelName}Factory
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: " . now()->toISOString() . "
// ============================================================

namespace Database\Factories\Arkzen;

use App\Models\Arkzen\\{$modelName};
use Illuminate\Database\Eloquent\Factories\Factory;

class {$modelName}Factory extends Factory
{
    protected \$model = {$modelName}::class;

    public function definition(): array
    {
        return [
{$definition}
        ];
    }
}
";

        File::put($filePath, $content);
        Log::info("[Arkzen Factory] ✓ Factory created: {$modelName}Factory");
    }

    // ─────────────────────────────────────────────
    // GENERATE FAKER DEFINITIONS
    // Maps column types to appropriate faker methods
    // ─────────────────────────────────────────────

    private static function generateDefinition(array $columns): string
    {
        $lines = [];

        foreach ($columns as $name => $config) {
            if (!empty($config['primary'])) continue;
            if (in_array($name, ['created_at', 'updated_at', 'deleted_at'])) continue;

            $faker = self::getFaker($name, $config);
            $lines[] = "            '{$name}' => {$faker},";
        }

        return implode("\n", $lines);
    }

    private static function getFaker(string $name, array $config): string
    {
        $type = $config['type'] ?? 'string';

        // Name-based detection first
        $nameFakers = [
            'name'        => 'fake()->name()',
            'title'       => 'fake()->sentence(3)',
            'email'       => 'fake()->unique()->safeEmail()',
            'phone'       => 'fake()->phoneNumber()',
            'address'     => 'fake()->address()',
            'description' => 'fake()->paragraph()',
            'content'     => 'fake()->paragraphs(3, true)',
            'slug'        => 'fake()->slug()',
            'url'         => 'fake()->url()',
            'image'       => 'fake()->imageUrl()',
            'image_path'  => 'fake()->imageUrl()',
            'color'       => 'fake()->hexColor()',
            'status'      => 'fake()->randomElement([\'active\', \'inactive\'])',
            'priority'    => 'fake()->randomElement([\'low\', \'medium\', \'high\'])',
            'role'        => 'fake()->randomElement([\'user\', \'admin\'])',
        ];

        foreach ($nameFakers as $namePart => $faker) {
            if (str_contains(strtolower($name), $namePart)) return $faker;
        }

        // Type-based detection
        return match($type) {
            'integer', 'bigInteger' => 'fake()->numberBetween(1, 1000)',
            'decimal', 'float'      => 'fake()->randomFloat(2, 1, 10000)',
            'boolean'               => 'fake()->boolean()',
            'date'                  => 'fake()->date()',
            'datetime', 'timestamp' => 'fake()->dateTime()',
            'text', 'longText'      => 'fake()->paragraph()',
            'json'                  => '[]',
            'uuid'                  => 'fake()->uuid()',
            default                 => 'fake()->word()',
        };
    }
}