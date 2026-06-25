import SwiftUI
import PhotosUI
import UIKit

struct LogClimbView: View {
    @State private var mountains: [Mountain] = []
    @State private var selectedMountainId: Int?
    @State private var date = Date()
    @State private var notes = ""
    @State private var visibility = "public"
    @State private var isSaving = false
    @State private var error: String?
    @State private var showSuccess = false
    @State private var pickerItem: PhotosPickerItem?
    @State private var photoData: Data?
    @State private var photoImage: Image?

    var body: some View {
        NavigationView {
            Form {
                Section("Peak") {
                    if mountains.isEmpty {
                        ProgressView()
                    } else {
                        Picker("Mountain", selection: $selectedMountainId) {
                            Text("Select a peak").tag(nil as Int?)
                            ForEach(mountains) { m in
                                Text("\(m.name) — \(m.elevation.formatted()) ft")
                                    .tag(m.id as Int?)
                            }
                        }
                    }
                }

                Section("Date") {
                    DatePicker(
                        "Climb Date",
                        selection: $date,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                }

                Section("Photo (optional)") {
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        HStack {
                            if let photoImage {
                                photoImage
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 60, height: 60)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            Text(photoData == nil ? "Add Photo" : "Change Photo")
                                .foregroundColor(.accentColor)
                        }
                    }
                    if photoData != nil {
                        Button("Remove Photo", role: .destructive) {
                            pickerItem = nil
                            photoData = nil
                            photoImage = nil
                        }
                    }
                }

                Section("Notes (optional)") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }

                Section("Visibility") {
                    Picker("Who can see this", selection: $visibility) {
                        Text("Public").tag("public")
                        Text("Followers").tag("followers")
                        Text("Private").tag("private")
                    }
                    .pickerStyle(.segmented)
                }

                if let error {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button {
                        Task { await save() }
                    } label: {
                        HStack {
                            Spacer()
                            Text(isSaving ? "Saving…" : "Log Climb")
                                .bold()
                            Spacer()
                        }
                    }
                    .disabled(selectedMountainId == nil || isSaving)
                }
            }
            .navigationTitle("Log a Climb")
            .alert("Climb Logged!", isPresented: $showSuccess) {
                Button("Done") { resetForm() }
            } message: {
                Text("Your summit has been recorded.")
            }
        }
        .task {
            mountains = (try? await APIClient.shared.mountains()) ?? []
        }
        .onChange(of: pickerItem) {
            Task { await loadPhoto() }
        }
    }

    private func loadPhoto() async {
        guard let item = pickerItem,
              let raw = try? await item.loadTransferable(type: Data.self) else { return }
        let compressed = compressPhoto(raw)
        photoData = compressed
        if let uiImage = UIImage(data: compressed) {
            photoImage = Image(uiImage: uiImage)
        }
    }

    private func compressPhoto(_ data: Data) -> Data {
        guard let uiImage = UIImage(data: data) else { return data }
        let maxDimension: CGFloat = 1200
        let size = uiImage.size
        let scale = min(maxDimension / max(size.width, size.height), 1.0)
        guard scale < 1.0 else { return uiImage.jpegData(compressionQuality: 0.8) ?? data }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in uiImage.draw(in: CGRect(origin: .zero, size: newSize)) }
        return resized.jpegData(compressionQuality: 0.8) ?? data
    }

    private func save() async {
        guard let mountainId = selectedMountainId else { return }
        isSaving = true
        error = nil
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        do {
            _ = try await APIClient.shared.logClimb(
                mountainId: mountainId,
                date: formatter.string(from: date),
                notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes,
                visibility: visibility,
                photoData: photoData
            )
            showSuccess = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func resetForm() {
        selectedMountainId = mountains.first?.id
        date = Date()
        notes = ""
        visibility = "public"
        pickerItem = nil
        photoData = nil
        photoImage = nil
    }
}
