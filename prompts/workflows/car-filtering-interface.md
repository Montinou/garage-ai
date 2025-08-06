<task name="Car Filtering Interface">

<task_objective>
Create a comprehensive responsive Argentinian car marketplace application that fetches real data from NeonDB. Using existing codebase components and NeonDB schema as inputs, reuse and adapt existing components while creating new responsive UI components and implementing filtering logic. Output will be a complete production-ready application with multiple pages including main marketplace dashboard with filters, vehicle profile pages, and dealerships directory - all with Spanish UI text and proper Next.js routing. No mockups, fallbacks, or hardcoding - only production-ready implementation.
</task_objective>

<detailed_sequence_steps>
# Car Filtering Interface - Detailed Sequence of Steps

## 1. Analyze Existing Codebase and NeonDB Schema

1. Use the `read_file` command to examine the current project structure and identify reusable components in `/components` directory.

2. Use the `read_file` command to analyze the NeonDB schema in `/lib/schema.ts` to understand available car and dealership data structures.

3. Use the `read_file` command to examine existing database queries in `/lib/queries.ts` and `/lib/dealership-queries.ts` to understand data fetching patterns.

4. Use the `read_file` command to review existing API routes in `/app/api` to understand current backend structure.

5. Document reusable components and identify gaps for new component creation.

## 2. Design Responsive UI Architecture and Component Structure

1. Create a component architecture plan based on existing UI components in `/components/ui`.

2. Design page layouts for:
   - Marketplace dashboard (`/marketplace`)
   - Vehicle profile (`/vehiculos/[id]`)
   - Dealerships directory (`/concesionarias`)

3. Plan responsive breakpoints and mobile-first design approach using existing Tailwind CSS setup.

4. Define component hierarchy and data flow patterns using existing patterns from `/components/agents`.

## 3. Create Shared Components and Utilities (Spanish Translations)

1. Use the `write_to_file` command to create `/lib/translations.ts` with Spanish translations for all UI text.

2. Use the `write_to_file` command to create shared layout components:
   - `components/layout/Header.tsx` - Main navigation header
   - `components/layout/Footer.tsx` - Site footer
   - `components/layout/Sidebar.tsx` - Filter sidebar

3. Use the `write_to_file` command to create reusable car-specific components:
   - `components/cars/CarCard.tsx` - Individual car display card
   - `components/cars/CarGrid.tsx` - Responsive car grid layout
   - `components/cars/FilterPanel.tsx` - Advanced filtering interface

4. Use the `write_to_file` command to create utility functions in `/lib/car-utils.ts` for price formatting, Spanish locale handling.

## 4. Implement Marketplace Dashboard with Filtering

1. Use the `write_to_file` command to create `/app/marketplace/page.tsx` with:
   - Server-side car data fetching from NeonDB
   - Responsive grid layout
   - Real-time search and filtering
   - Pagination implementation

2. Use the `write_to_file` command to create API routes for filtering:
   - `/app/api/cars/search/route.ts` - Advanced search with filters
   - `/app/api/cars/featured/route.ts` - Featured listings

3. Use the `write_to_file` command to create advanced filtering components:
   - Price range slider
   - Make/model dropdowns
   - Year range selection
   - Location-based filtering

4. Implement state management for filters using React hooks and URL search params.

## 5. Build Vehicle Profile Page

1. Use the `write_to_file` command to create `/app/vehiculos/[id]/page.tsx` with:
   - Dynamic route handling for vehicle IDs
   - Complete vehicle details from NeonDB
   - Image gallery with responsive design
   - Contact dealership functionality

2. Use the `write_to_file` command to create vehicle-specific components:
   - `components/cars/VehicleGallery.tsx` - Image carousel
   - `components/cars/VehicleSpecs.tsx` - Technical specifications
   - `components/cars/ContactDealer.tsx` - Dealership contact form

3. Use the `write_to_file` command to create `/app/api/cars/[id]/route.ts` for single vehicle data fetching.

4. Implement SEO optimization with Next.js metadata API for vehicle pages.

## 6. Create Dealerships Directory

1. Use the `write_to_file` command to create `/app/concesionarias/page.tsx` with:
   - Dealership listings from NeonDB
   - Location-based search
   - Responsive card layout

2. Use the `write_to_file` command to create `/app/concesionarias/[id]/page.tsx` for individual dealership pages with:
   - Dealership profile information
   - Available vehicles list
   - Contact information and location map

3. Use the `write_to_file` command to create dealership components:
   - `components/dealerships/DealerCard.tsx` - Dealership display card
   - `components/dealerships/DealerProfile.tsx` - Detailed profile view
   - `components/dealerships/LocationMap.tsx` - Interactive map component

## 7. Set Up Routing and Navigation

1. Use the `edit_file` command to update `/app/layout.tsx` to include:
   - Spanish language configuration
   - Global navigation header
   - Mobile-responsive layout

2. Use the `write_to_file` command to create navigation components:
   - `components/navigation/MainNav.tsx` - Primary navigation menu
   - `components/navigation/MobileNav.tsx` - Mobile hamburger menu
   - `components/navigation/Breadcrumbs.tsx` - Page breadcrumb navigation

3. Implement Next.js App Router with proper page hierarchy and dynamic routes.

4. Add loading states using `loading.tsx` files for each route segment.

## 8. Integrate with NeonDB and Implement Data Fetching

1. Use the `edit_file` command to extend `/lib/queries.ts` with car-specific queries:
   - Advanced search queries with filters
   - Featured car listings
   - Dealership inventory queries

2. Use the `write_to_file` command to create `/lib/car-queries.ts` with production-ready database queries:
   - Optimized queries with proper indexing
   - Error handling and connection pooling
   - Real-time data fetching strategies

3. Implement server-side data fetching using Next.js 13+ patterns with proper caching strategies.

4. Create data validation schemas using existing patterns from the codebase.

## 9. Test Responsiveness and Functionality

1. Use the `bash` command to run the development server and test all routes.

2. Verify responsive design across different screen sizes (mobile, tablet, desktop).

3. Test all filtering functionality with real NeonDB data.

4. Validate Spanish translations and proper locale formatting.

5. Use the `bash` command to run type checking and linting to ensure code quality.

6. Test performance with real data loads and optimize where necessary.

</detailed_sequence_steps>

</task>