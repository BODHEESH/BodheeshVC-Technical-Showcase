/**
 * Java OOP Concepts and Advanced Features Demonstration
 * Showcasing inheritance, polymorphism, collections, exception handling
 */

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

// 1. Abstract Base Class
abstract class Employee {
    protected String name;
    protected String employeeId;
    protected double baseSalary;
    protected LocalDateTime joinDate;

    public Employee(String name, String employeeId, double baseSalary) {
        this.name = name;
        this.employeeId = employeeId;
        this.baseSalary = baseSalary;
        this.joinDate = LocalDateTime.now();
    }

    // Abstract method - must be implemented by subclasses
    public abstract double calculateSalary();
    public abstract String getRole();

    // Concrete methods
    public String getName() { return name; }
    public String getEmployeeId() { return employeeId; }
    public LocalDateTime getJoinDate() { return joinDate; }

    @Override
    public String toString() {
        return String.format("Employee{name='%s', id='%s', role='%s'}", 
                           name, employeeId, getRole());
    }
}

// 2. Interface Definition
interface Manageable {
    void assignProject(String projectName);
    List<String> getAssignedProjects();
    void completeProject(String projectName);
}

// 3. Concrete Classes with Inheritance
class Developer extends Employee implements Manageable {
    private List<String> programmingLanguages;
    private List<String> assignedProjects;
    private int experienceYears;

    public Developer(String name, String employeeId, double baseSalary, int experienceYears) {
        super(name, employeeId, baseSalary);
        this.experienceYears = experienceYears;
        this.programmingLanguages = new ArrayList<>();
        this.assignedProjects = new ArrayList<>();
    }

    @Override
    public double calculateSalary() {
        // Salary increases with experience
        return baseSalary + (experienceYears * 5000);
    }

    @Override
    public String getRole() {
        return "Software Developer";
    }

    @Override
    public void assignProject(String projectName) {
        assignedProjects.add(projectName);
        System.out.println(name + " assigned to project: " + projectName);
    }

    @Override
    public List<String> getAssignedProjects() {
        return new ArrayList<>(assignedProjects);
    }

    @Override
    public void completeProject(String projectName) {
        if (assignedProjects.remove(projectName)) {
            System.out.println(name + " completed project: " + projectName);
        }
    }

    public void addProgrammingLanguage(String language) {
        programmingLanguages.add(language);
    }

    public List<String> getProgrammingLanguages() {
        return new ArrayList<>(programmingLanguages);
    }
}

class ProjectManager extends Employee implements Manageable {
    private List<String> managedProjects;
    private int teamSize;

    public ProjectManager(String name, String employeeId, double baseSalary, int teamSize) {
        super(name, employeeId, baseSalary);
        this.teamSize = teamSize;
        this.managedProjects = new ArrayList<>();
    }

    @Override
    public double calculateSalary() {
        // Salary increases with team size
        return baseSalary + (teamSize * 2000);
    }

    @Override
    public String getRole() {
        return "Project Manager";
    }

    @Override
    public void assignProject(String projectName) {
        managedProjects.add(projectName);
        System.out.println(name + " now managing project: " + projectName);
    }

    @Override
    public List<String> getAssignedProjects() {
        return new ArrayList<>(managedProjects);
    }

    @Override
    public void completeProject(String projectName) {
        if (managedProjects.remove(projectName)) {
            System.out.println(name + " successfully delivered project: " + projectName);
        }
    }

    public int getTeamSize() { return teamSize; }
}

// 4. Custom Exception Classes
class ProjectNotFoundException extends Exception {
    public ProjectNotFoundException(String projectName) {
        super("Project not found: " + projectName);
    }
}

class InsufficientResourcesException extends RuntimeException {
    public InsufficientResourcesException(String message) {
        super("Insufficient resources: " + message);
    }
}

// 5. Generic Classes
class Repository<T> {
    private Map<String, T> items;

    public Repository() {
        this.items = new HashMap<>();
    }

    public void save(String id, T item) {
        items.put(id, item);
    }

    public Optional<T> findById(String id) {
        return Optional.ofNullable(items.get(id));
    }

    public List<T> findAll() {
        return new ArrayList<>(items.values());
    }

    public boolean delete(String id) {
        return items.remove(id) != null;
    }

    public int count() {
        return items.size();
    }
}

// 6. Main Application Class
public class OOPConcepts {
    private Repository<Employee> employeeRepository;
    private Repository<String> projectRepository;

    public OOPConcepts() {
        this.employeeRepository = new Repository<>();
        this.projectRepository = new Repository<>();
        initializeSampleData();
    }

    private void initializeSampleData() {
        // Create sample employees
        Developer bodheesh = new Developer("Bodheesh VC", "DEV001", 80000, 3);
        bodheesh.addProgrammingLanguage("JavaScript");
        bodheesh.addProgrammingLanguage("TypeScript");
        bodheesh.addProgrammingLanguage("Java");
        bodheesh.addProgrammingLanguage("C");

        ProjectManager manager = new ProjectManager("Alice Johnson", "PM001", 120000, 5);

        // Save to repository
        employeeRepository.save("DEV001", bodheesh);
        employeeRepository.save("PM001", manager);

        // Create sample projects
        projectRepository.save("PROJ001", "E-commerce Platform");
        projectRepository.save("PROJ002", "Mobile Banking App");
        projectRepository.save("PROJ003", "Real-time Chat System");
    }

    // 7. Stream API and Lambda Expressions
    public void demonstrateStreamAPI() {
        System.out.println("\n=== Stream API Demonstration ===");
        
        List<Employee> employees = employeeRepository.findAll();
        
        // Filter and map operations
        List<String> developerNames = employees.stream()
            .filter(emp -> emp instanceof Developer)
            .map(Employee::getName)
            .collect(Collectors.toList());
        
        System.out.println("Developers: " + developerNames);

        // Calculate average salary
        double averageSalary = employees.stream()
            .mapToDouble(Employee::calculateSalary)
            .average()
            .orElse(0.0);
        
        System.out.println("Average Salary: $" + String.format("%.2f", averageSalary));

        // Group by role
        Map<String, List<Employee>> employeesByRole = employees.stream()
            .collect(Collectors.groupingBy(Employee::getRole));
        
        employeesByRole.forEach((role, empList) -> 
            System.out.println(role + ": " + empList.size() + " employees"));
    }

    // 8. Exception Handling
    public void assignProjectToEmployee(String employeeId, String projectId) 
            throws ProjectNotFoundException {
        try {
            Optional<Employee> employee = employeeRepository.findById(employeeId);
            Optional<String> project = projectRepository.findById(projectId);

            if (employee.isEmpty()) {
                throw new IllegalArgumentException("Employee not found: " + employeeId);
            }

            if (project.isEmpty()) {
                throw new ProjectNotFoundException(projectId);
            }

            if (employee.get() instanceof Manageable) {
                ((Manageable) employee.get()).assignProject(project.get());
            } else {
                throw new InsufficientResourcesException("Employee cannot be assigned projects");
            }

        } catch (IllegalArgumentException e) {
            System.err.println("Invalid employee ID: " + e.getMessage());
            throw e;
        } catch (ProjectNotFoundException e) {
            System.err.println("Project assignment failed: " + e.getMessage());
            throw e;
        }
    }

    // 9. Collections Framework Demonstration
    public void demonstrateCollections() {
        System.out.println("\n=== Collections Framework Demo ===");

        // ArrayList - Dynamic array
        List<String> skills = new ArrayList<>(Arrays.asList(
            "JavaScript", "TypeScript", "React", "Node.js", "Java"
        ));

        // LinkedHashSet - Ordered unique elements
        Set<String> uniqueSkills = new LinkedHashSet<>(skills);
        uniqueSkills.add("MongoDB");
        uniqueSkills.add("PostgreSQL");

        // TreeMap - Sorted key-value pairs
        Map<String, Integer> skillProficiency = new TreeMap<>();
        skillProficiency.put("JavaScript", 5);
        skillProficiency.put("TypeScript", 4);
        skillProficiency.put("Java", 4);
        skillProficiency.put("React", 5);

        // Queue - FIFO operations
        Queue<String> taskQueue = new LinkedList<>();
        taskQueue.offer("Code Review");
        taskQueue.offer("Unit Testing");
        taskQueue.offer("Documentation");

        System.out.println("Skills: " + skills);
        System.out.println("Unique Skills: " + uniqueSkills);
        System.out.println("Skill Proficiency: " + skillProficiency);
        System.out.println("Next Task: " + taskQueue.poll());
    }

    // 10. Multithreading with CompletableFuture
    public CompletableFuture<String> processProjectAsync(String projectName) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Simulate processing time
                Thread.sleep(2000);
                return "Project " + projectName + " processed successfully";
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Processing interrupted", e);
            }
        });
    }

    // Main method to demonstrate all features
    public static void main(String[] args) {
        OOPConcepts demo = new OOPConcepts();
        
        try {
            // Demonstrate polymorphism
            System.out.println("=== Polymorphism Demo ===");
            List<Employee> employees = demo.employeeRepository.findAll();
            for (Employee emp : employees) {
                System.out.println(emp + " - Salary: $" + emp.calculateSalary());
            }

            // Demonstrate collections
            demo.demonstrateCollections();

            // Demonstrate streams
            demo.demonstrateStreamAPI();

            // Demonstrate project assignment
            System.out.println("\n=== Project Assignment Demo ===");
            demo.assignProjectToEmployee("DEV001", "PROJ001");
            demo.assignProjectToEmployee("PM001", "PROJ002");

            // Demonstrate async processing
            System.out.println("\n=== Async Processing Demo ===");
            CompletableFuture<String> future = demo.processProjectAsync("E-commerce Platform");
            System.out.println("Processing started...");
            System.out.println(future.get()); // Wait for completion

        } catch (Exception e) {
            System.err.println("Error occurred: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
