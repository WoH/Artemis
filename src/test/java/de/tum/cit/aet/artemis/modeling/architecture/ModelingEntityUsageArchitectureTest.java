package de.tum.cit.aet.artemis.modeling.architecture;

import de.tum.cit.aet.artemis.shared.architecture.module.AbstractModuleEntityUsageArchitectureTest;

/**
 * Architecture test to verify that REST controllers in the Modeling module
 * do not use @Entity types directly. Controllers should use DTOs instead.
 * <p>
 * TODO: Reduce the remaining 4 entity-return violations to 0. They all live in
 * {@code ApollonDiagramResource}, which is out of scope for this migration and owned by PR #12994.
 */
class ModelingEntityUsageArchitectureTest extends AbstractModuleEntityUsageArchitectureTest {

    @Override
    public String getModulePackage() {
        return ARTEMIS_PACKAGE + ".modeling";
    }

    // TODO: Reduce this to 0 by returning DTOs instead of entities from ApollonDiagramResource (owned by PR #12994)
    @Override
    protected int getExpectedEntityReturnViolations() {
        return 4;
    }

    // TODO: Reduce this to 0 by accepting DTOs instead of entities in @RequestBody/@RequestPart
    @Override
    protected int getExpectedEntityInputViolations() {
        return 0;
    }

    // TODO: Reduce this to 0 by removing entity references from DTOs
    @Override
    protected int getExpectedDtoEntityFieldViolations() {
        return 0;
    }
}
